#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = [
# 'websocket-server',
# ]
# ///
import threading
import logging
import http.server
import websocket_server
import time
import os

# I didn't set up logging to work with threading, so I'm using print statements for stuff in other threads.
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG)

hostname = "localhost"
port = 8080
ws_port = 13258
http.server.SimpleHTTPRequestHandler.extensions_map['mjs'] = 'application/javascript'
print(f"Extensions map: {http.server.SimpleHTTPRequestHandler.extensions_map}")
server = http.server.HTTPServer(
    server_address=(hostname, port),
    RequestHandlerClass=http.server.SimpleHTTPRequestHandler)
print(f"Server started at http://{hostname}:{port}")

ws_server = websocket_server.WebsocketServer(host=hostname, port=ws_port,loglevel=logging.DEBUG)

def new_ws_client(client, server: websocket_server.WebsocketServer):
    print(f"New client: {client['address']}")

ws_server.set_fn_new_client(new_ws_client)


def newest_file_update(path='.'):
    """Walk the file tree and return the newest file update timestamp."""
    new_timestamp = 0
    for dirpath, dirnames, filenames in os.walk(path):
        
        if '.git' in dirpath:
            continue
        for file in filenames:
            file_path = os.path.join(dirpath, file)
            file_timestamp = os.path.getmtime(file_path)
            if file_timestamp > new_timestamp:
                new_timestamp = file_timestamp
    return new_timestamp

def watch(server):
    print("Watching for file changes...")
    last_update = float('-inf')
    while True:
        new_update = newest_file_update()
        if new_update > last_update:
            last_update = new_update
            server.send_message_to_all("reload")
            print("Files changed. Reloading...")
        time.sleep(0.1)
    
http_server = threading.Thread(target=server.serve_forever)
file_watcher = threading.Thread(target=watch, args=(ws_server,))
ws_server = threading.Thread(target=ws_server.run_forever)

try:
    file_watcher.start() # in separate thread!!!
    print("File watcher started.")
    http_server.start() # in a separate thread!!!
    print("HTTP server started.")
    ws_server.start() # in a separate thread!!!
    print("Websocket server started.")
    while True:
        time.sleep(100)
    
except KeyboardInterrupt:
    pass
print("All is stopped.")