#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# ///
import http.server

hostname = "localhost"
port = 8080
ws_port = 13258
http.server.SimpleHTTPRequestHandler.extensions_map['mjs'] = 'application/javascript'
print(f"Extensions map: {http.server.SimpleHTTPRequestHandler.extensions_map}")
server = http.server.HTTPServer(
    server_address=(hostname, port),
    RequestHandlerClass=http.server.SimpleHTTPRequestHandler)
print(f"Server started at http://{hostname}:{port}")

try:
    server.serve_forever()
except KeyboardInterrupt:
    server.shutdown()

print("Stopped.")