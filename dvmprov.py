from flask import Flask, send_from_directory, request, Response
from waitress import serve
from rest import *
import argparse
import logging
import requests
import hashlib
import json

logging.basicConfig()
logging.getLogger().setLevel(logging.INFO)

parser = argparse.ArgumentParser()

parser.add_argument("-b", "--bind", help="bind address for webserver (default: 127.0.0.1)", nargs='?', default='127.0.0.1', type=str)
parser.add_argument("-p", "--port", help="port for webserver (default: 8180)", nargs='?', default=8180, type=int)
parser.add_argument("-r", "--reverse-proxy", action="store_true", help="notify the webserver it's behind a reverse proxy")
parser.add_argument("-v", "--debug", help="enable debug logging", action="store_true")



auth_token = None
rest_host = None

args = parser.parse_args()

if args.debug:
    logging.getLogger().setLevel(logging.DEBUG)
    logging.debug("Debug logging enabled")
else:
    logging.getLogger().setLevel(logging.INFO)

"""
Authenticate with the FNE REST API
"""
def rest_auth():
    global auth_token
    global rest_host
    # Hash our password
    hashPass = hashlib.sha256(rest_api_password.encode()).hexdigest()
    # Make a request to get our auth token
    result = requests.request(
        method = 'PUT',
        url = "http://%s:%u/auth" % (rest_api_address, rest_api_port),
        json = {'auth': hashPass},
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
    try:
        response = json.loads(result.content)
        if "status" in response:
            if response["status"] != 200:
                logging.error("Got error from FNE REST API during auth exchange: %s" % response["message"])
                exit(1)
            if "token" in response:
                auth_token = response["token"]
                rest_host = "%s:%u" % (rest_api_address, rest_api_port)
                logging.info("Successfully authenticated with FNE REST API")
        else:
            logging.error("Invalid response received from FNE REST API during auth exchange: %s" % result.content)
            exit(1)
    except Exception as ex:
        logging.error("Caught exception during FNE REST API authentication: %s" % ex)
        exit(1)

"""
We test our current auth token by requesting the version of the FNE

If this fails, we redo the auth process
"""
def test_auth():
    logging.debug("Testing authentication to FNE instance")
    # Make sure we've authenticated previously
    if not auth_token and not rest_host:
        logging.warning("REST API connection to FNE not initialized")
        rest_auth()
        if (test_auth()):
            return True
        else:
            logging.error("Failed to authenticate with FNE")
            return False
    
    # Make the request/post/whatever
    headers = {}
    headers['X-DVM-Auth-Token'] = auth_token
    logging.debug(request.get_data())
    result = requests.request(
        method          = 'GET',
        url             = "http://%s/%s" % (rest_host, "version"),
        headers         = headers,
        allow_redirects = False
    )
    
    # Check we were successful
    resultObj = json.loads(result.content)
    if "status" not in resultObj:
        logging.error("Got invalid response when testing authentication to FNE: %s" % result.content)
        return False
    elif resultObj["status"] != 200:
        logging.error("Got status %d when testing authentication to FNE" % resultObj["status"])
        return False
    else:
        logging.debug("Auth test returned OK!")
        return True

# Init Flash
app = Flask(
    __name__,
    static_folder='html'
)

"""
Root handlers for static pages
"""
@app.route('/')
def root():
    return app.send_static_file("index.html")
# Images Static Path
@app.route('/images/<path:path>')
def send_image(path):
    logging.debug("Got image request %s" % path)
    return send_from_directory('html/images', path)
# JS Static Path
@app.route('/js/<path:path>')
def send_js(path):
    logging.debug("Got js request %s" % path)
    return send_from_directory('html/js', path)
# CSS Static Path
@app.route('/css/<path:path>')
def send_css(path):
    logging.debug("Got css request %s" % path)
    return send_from_directory('html/css', path)

"""
Handler for REST API proxying

https://stackoverflow.com/a/36601467/1842613
"""
@app.route('/rest/<path:path>', methods=['GET', 'POST', 'PUT'])
def rest(path):
    logging.debug("Got REST %s for %s" % (request.method, path))
    
    # Make sure we're authenticated
    if not auth_token and not rest_host:
        logging.error("REST API connection to FNE not initialized!")
        rest_auth()
        if not test_auth():
            logging.error("Failed to authenticate with FNE")
            exit(1)
    
    # Make sure we have valid auth
    if not test_auth():
        logging.warning("Authentication token expired, reauthenticating...")
        rest_auth()
        if not test_auth():
            logging.error("Failed to re-authenticated with FNE")
            exit(1)
    
    # Make the request/post/whatever
    headers = {k:v for k,v in request.headers if k.lower() != 'host'}
    headers['X-DVM-Auth-Token'] = auth_token
    logging.debug(request.get_data())
    result = requests.request(
        method          = request.method,
        url             = "http://%s/%s" % (rest_host, path),
        headers         = headers,
        data            = request.get_data(),
        allow_redirects = False
    )
    
    # Exclude headers in response
    excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']  #NOTE we here exclude all "hop-by-hop headers" defined by RFC 2616 section 13.5.1 ref. https://www.rfc-editor.org/rfc/rfc2616#section-13.5.1
    headers          = [
        (k,v) for k,v in result.raw.headers.items()
        if k.lower() not in excluded_headers
    ]
    
    # Finalize the response
    response = Response(result.content, result.status_code, headers)
    return response

# Optional reverse proxy fix
if args.reverse_proxy:
    from werkzeug.middleware.proxy_fix import ProxyFix
    app.wsgi_app = ProxyFix(
        app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1
    )
    logging.info("Reverse proxy support enabled")

# Start serving
if __name__ == '__main__':
    # Init REST
    rest_auth()
    # Serve
    serve(app, host=args.bind, port=args.port)