import hashlib
import requests
import logging
import json
import time
from flask import request, Response
from requests.packages.urllib3.connection import HTTPConnection, socket

class HTTPAdapterWithSocketOptions(requests.adapters.HTTPAdapter):
    def __init__(self, *args, **kwargs):
        self.socket_options = kwargs.pop("socket_options", None)
        super(HTTPAdapterWithSocketOptions, self).__init__(*args, **kwargs)

    def init_poolmanager(self, *args, **kwargs):
        if self.socket_options is not None:
            kwargs["socket_options"] = self.socket_options
        super(HTTPAdapterWithSocketOptions, self).init_poolmanager(*args, **kwargs)

class DVMRest:

    def __init__(self, _host, _port, _password):
        # Store connection details
        self.host = _host
        self.port = _port
        # Hash our password
        self.hashPass = hashlib.sha256(_password.encode()).hexdigest()
        # Try to prevent requests from segmenting TCP packets
        self.session = requests.Session()
        options = HTTPConnection.default_socket_options + [ (socket.IPPROTO_TCP, socket.TCP_CORK, 1)]
        adapter = HTTPAdapterWithSocketOptions(socket_options=options)
        self.session.mount("http://", adapter)
        # Authenticated status
        self.authInProgress = False
        self.token = None
        self.authenticated = False

    def auth(self):
        # Wait for auth if in progress
        if self.authInProgress:
            logging.warn("Auth already in progress!")
            timeout = time.time() + 0.5
            while not self.authenticated:
                if time.time() > timeout:
                    break
            return self.authenticated
        else:
            # Capture the auth process
            self.authInProgress = True
            self.authenticated = False
            try:
                # Make a request to get the auth token
                result = self.session.put(
                    url = "http://%s:%u/auth" % (self.host, self.port),
                    headers = {'Content-type': 'application/json'},
                    json = {'auth': self.hashPass}
                )
                # Debug
                logging.debug("--- REQ ---")
                logging.debug(result.request.url)
                logging.debug(result.request.headers)
                logging.debug(result.request.body)
                logging.debug("--- RESP ---")
                logging.debug(result.url)
                logging.debug(result.headers)
                logging.debug(result.content)
                # Try to convert the response to JSON
                response = json.loads(result.content)
                if "status" in response:
                    if response["status"] != 200:
                        logging.error("Got error from REST API at %s:%u during auth exchange: %s" % (self.host, self.port, response["message"]))
                        self.authInProgress = False
                        return False
                    if "token" in response:
                        self.token = response["token"]
                        self.authenticated = True
                        logging.info("Successfully authenticated with REST API at %s:%u" % (self.host, self.port))
                        self.authInProgress = False
                        return True
                else:
                    logging.error("Invalid response received from REST API at %s:%u during auth exchange: %s" % (self.host, self.port, result.content))
                    self.authInProgress = False
                    return False
            except Exception as ex:
                logging.error("Caught exception during REST API authentication to %s:%u: %s" % (self.host, self.port, ex))
                self.authInProgress = False
                return False

    def test(self):
        logging.debug("Testing authentication to REST endpoint")
        # Wait for auth
        # Make sure we've authenticated previously
        if not self.authenticated and not self.token:
            logging.warning("REST API connection to %s:%u not initialized" % (self.host, self.port))
            if not self.auth():
                logging.error("REST authentication failed")
                return False
        try:
            # Test connection
            headers = {'X-DVM-Auth-Token': self.token}
            result = self.session.get(
                url = "http://%s:%u/version" % (self.host, self.port),
                headers = headers,
                allow_redirects = False
            )
            # Parse Result
            resultObj = json.loads(result.content)
            if "status" not in resultObj:
                logging.error("Got invalid response when testing authentication to %s:%u: %s" % (self.host, self.port, result.content))
                self.authenticated = False
                return False
            elif resultObj["status"] != 200:
                logging.error("Got status %d when testing authentication to %s:%u: %s" % (resultObj["status"], self.host, self.port, resultObj["message"]))
                self.authenticated = False
                return False
            else:
                logging.debug("Auth test returned OK!")
                return True
        except json.decoder.JSONDecodeError:
            logging.error("Failed to decode result as JSON: %s" % result.content)
            return False
        except (ConnectionRefusedError, requests.exceptions.ConnectionError):
            logging.error("Connection refused when connecting to %s:%u" % (self.host, self.port))
            return False
        
    def get(self, path):
        logging.debug("Got REST GET for %s" % path)

        # Make sure we're authenticated
        if not self.test():
            logging.warn("REST authentication failed, re-initializing")
            if not self.auth():
                logging.error("REST authentication failed")
                return False
            
        try:
            
            result = requests.request(
                method          = 'GET',
                url             = "http://%s:%u/%s" % (self.host, self.port, path),
                headers         = {'X-DVM-Auth-Token': self.token},
                allow_redirects = False
            )

            # Debug
            logging.debug("--- REQ ---")
            logging.debug("    %s" % result.request.url)
            logging.debug("    %s" % result.request.headers)
            logging.debug("    %s" % result.request.body)
            logging.debug("--- RESP ---")
            logging.debug("    %s" % result.url)
            logging.debug("    %s" % result.headers)
            logging.debug("    %s" % result.content)

            # Parse JSON
            resultObj = json.loads(result.content)
            if "status" not in resultObj:
                logging.error("Got invalid response for REST path %s: %s" % (path, result.content))
                return False
            elif resultObj["status"] != 200:
                logging.error("Got status %d for REST path %s: %s" % (resultObj["status"], path, resultObj["message"]))
                return False
            else:
                return resultObj
            
        except json.decoder.JSONDecodeError:
            logging.error("Failed to decode result as JSON: %s" % result.content)
            return False
        except (ConnectionRefusedError, requests.exceptions.ConnectionError):
            logging.error("Connection refused when connecting to %s:%u" % (self.host, self.port))
            return False
        
    # Proxy a request from a flask endpoint
    def rest_proxy(self, path, request):
        logging.debug("Got proxied REST %s request for %s" % (request.method, path))

        # Make sure we're authenticated
        if not self.test():
            logging.warn("REST authentication failed, re-initializing")
            if not self.auth():
                logging.error("REST authentication failed")
                return False
            
        # Make the GET request
        headers = { k:v for k,v in request.headers if k.lower() != 'host' }
        headers['X-DVM-Auth-Token'] = self.token
        result = requests.request(
            method          = request.method,
            url             = "http://%s:%u/%s" % (self.host, self.port, path),
            headers         = headers,
            data            = request.get_data(),
            allow_redirects = False
        )
        
        # Debug
        logging.debug("--- REQ ---")
        logging.debug(result.request.url)
        logging.debug(result.request.headers)
        logging.debug(result.request.body)
        logging.debug("--- RESP ---")
        logging.debug(result.url)
        logging.debug(result.headers)
        logging.debug(result.content)
        
        # Exclude headers in response
        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']  #NOTE we here exclude all "hop-by-hop headers" defined by RFC 2616 section 13.5.1 ref. https://www.rfc-editor.org/rfc/rfc2616#section-13.5.1
        headers          = [
            (k,v) for k,v in result.raw.headers.items()
            if k.lower() not in excluded_headers
        ]

        # Finalize the response
        response = Response(result.content, result.status_code, headers)
        return response