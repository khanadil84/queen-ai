from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path

ROOT = Path(__file__).resolve().parent

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        super().end_headers()

server = ThreadingHTTPServer(
    ("127.0.0.1", 8787),
    partial(Handler, directory=str(ROOT))
)
print("Queen AI: http://127.0.0.1:8787")
print("Keep this window open. Press Ctrl+C to stop.")
server.serve_forever()
