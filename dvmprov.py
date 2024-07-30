from flask import Flask, send_from_directory, request, Response, abort, make_response, send_file
from waitress import serve
import argparse
import logging
import requests
import hashlib
import json
import xml.etree.cElementTree as ET
from xml.dom import minidom
from io import BytesIO

from rest import *

from dvmrest import DVMRest

logging.basicConfig()
logging.getLogger().setLevel(logging.INFO)

parser = argparse.ArgumentParser()

parser.add_argument("-b", "--bind", help="bind address for webserver (default: 127.0.0.1)", nargs='?', default='127.0.0.1', type=str)
parser.add_argument("-p", "--port", help="port for webserver (default: 8180)", nargs='?', default=8180, type=int)
parser.add_argument("-r", "--reverse-proxy", action="store_true", help="notify the webserver it's behind a reverse proxy")
parser.add_argument("-v", "--debug", help="enable debug logging", action="store_true")

fneRest = None

args = parser.parse_args()

# Logging level
if args.debug:
    logging.getLogger().setLevel(logging.DEBUG)
    logging.debug("Debug logging enabled")
else:
    logging.getLogger().setLevel(logging.INFO)

# Init Flash
app = Flask(
    __name__,
    static_folder='html'
)

# Optional reverse proxy fix
if args.reverse_proxy:
    from werkzeug.middleware.proxy_fix import ProxyFix
    app.wsgi_app = ProxyFix(
        app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1
    )
    logging.info("Reverse proxy support enabled")

"""
Contacts List Parsing
"""

def contactsArmada():
    """
    Create a contacts list formatted for EFJ armada

    This one is simple, format is ALIAS<tab>RID<newline>
    """

    # Get RIDs
    rids = fneRest.get("rest/rid/query")["rids"]

    # Sort by id
    rids = sorted(rids, key=lambda d: d['id'])

    # Placeholder for list
    contacts = ""

    # Iterate
    for rid in rids:
        if rid["enabled"] and rid["alias"] != "":
            logging.debug(f'Adding RID {rid["id"]} ({rid["alias"]}) to Armada contacts string')
            contacts += f'{rid["alias"]}\t{rid["id"]}\n'

    return contacts

def contactsApxUCL(systemName):
    """
    Create a contacts list xml file formatted for APX CPS

    This one is annoying but works
    """

    # This is the basic XML structure
    xml_root = ET.Element("import_export_doc")
    ET.SubElement(xml_root, "Version").text = "2"
    ET.SubElement(xml_root, "Language").text = "en"
    root = ET.SubElement(xml_root, "Root", {"ExportedAllFeatures":"False", "ConverterGenerated":"False"})
    recset = ET.SubElement(root, "Recset", {"Name":"Unified Call List", "Id":"2200"})

    # Add each contact
    rids = fneRest.get("rest/rid/query")["rids"]

    # Sort by id
    rids = sorted(rids, key=lambda d: d['id'])

    # Iterate
    for rid in rids:
        if rid["enabled"] and rid["alias"] != "":
            logging.debug(f'Adding RID {rid["id"]} ({rid["alias"]}) to APX UCL XML')
            # New node
            node = ET.SubElement(recset, "Node", {"Name":"Contacts", "ReferenceKey":rid["alias"]})
            # Contact name section
            sectionGeneral = ET.SubElement(node, "Section", {"Name":"General", "id":"10400"})
            contactName = ET.SubElement(sectionGeneral, "Field", {"Name":"Contact Name"}).text = rid["alias"]
            # Contact Astro25 ID
            sectionAstro25 = ET.SubElement(node, "Section", {"Name":"ASTRO 25 Trunking ID", "id":"10401", "Embedded":"True"})
            embeddedRecset = ET.SubElement(sectionAstro25, "EmbeddedRecset", {"Name":"ASTRO 25 Trunking ID List", "Id":"2201"})
            embeddedNode = ET.SubElement(embeddedRecset, "EmbeddedNode", {"Name":"ASTRO 25 Trunking ID", "ReferenceKey":str(rid["id"])})
            embeddedSection = ET.SubElement(embeddedNode, "EmbeddedSection", {"Name":"ASTRO 25 Trunking IDs", "id":"10402"})
            # Here's the actual ID stuff lol
            ET.SubElement(embeddedSection, "Field", {"Name":"System Name"}).text = systemName
            ET.SubElement(embeddedSection, "Field", {"Name":"Custom WACN ID"}).text = "1"
            ET.SubElement(embeddedSection, "Field", {"Name":"Custom System ID"}).text = "1"
            ET.SubElement(embeddedSection, "Field", {"Name":"Unit ID"}).text = str(rid["id"])

    # Convert to string
    xmlString = ET.tostring(xml_root, 'utf-8')

    # Pretty print
    reparsed = minidom.parseString(xmlString)
    prettyString = reparsed.toprettyxml(indent="  ")
    #print(prettyString)

    return prettyString

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
Handlers for API calls
"""

@app.route('/rest/<path:path>', methods=['GET', 'POST', 'PUT'])
def rest(path):
    logging.debug("Got REST %s for %s" % (request.method, path))
    # Proxy rest
    return fneRest.rest_proxy(path, request)

@app.route("/contacts/armada")
def getContactsArmada():
    return Response(contactsArmada(), mimetype="text/plain")

@app.route("/contacts/apxucl")
def getContactsApxUCL():
    # Get the XML string
    xmlString = contactsApxUCL(request.args.get("system"))
    
    # We have to convert to bytes before we can send the file
    buffer = BytesIO()
    buffer.write(xmlString.encode('utf-8'))
    buffer.seek(0)

    # Return XML file
    return send_file(
        buffer,
        as_attachment=True,
        download_name=f'apx_ucl_dvm_export.xml',
        mimetype='text/xml'
    )

"""
Main
"""

# Start serving
if __name__ == '__main__':
    # Init REST
    fneRest = DVMRest(rest_api_address, rest_api_port, rest_api_password)
    fneRest.auth()
    # Serve
    serve(app, host=args.bind, port=args.port)