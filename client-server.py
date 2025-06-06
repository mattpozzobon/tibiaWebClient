import http.server
import ssl
import sys
from functools import partial
from urllib.parse import quote
import re

ASSET_BASE = (
    "https://pub-731c9162b7da4ead9743fb831880fd77.r2.dev"  # <- your public dev URL
    "/data/1098"                                           # key prefix
)

ADDRESS = ("127.0.0.1", 8000)


class TibiaHandler(http.server.SimpleHTTPRequestHandler):
    """
    • Serves everything in ./client exactly like SimpleHTTPRequestHandler.
    • For any request that starts with /data/1098/, respond with a 302 redirect
      to the public R2 object.
    """

    # Regex that matches both GET and HEAD for our four files
    DATA_RE = re.compile(r"^/data/1098/(Tibia\.(spr|dat|otfi)|constants\.json)$", re.I)

    def do_GET(self):
        if self._maybe_redirect():
            return
        super().do_GET()

    def do_HEAD(self):
        if self._maybe_redirect():
            return
        super().do_HEAD()

    def _maybe_redirect(self) -> bool:
        """Return True if we handled the request (via redirect)."""
        if self.DATA_RE.match(self.path):
            target = f"{ASSET_BASE}/{quote(self.path.split('/')[-1])}"
            self.send_response(302)
            self.send_header("Location", target)
            self.end_headers()
            return True
        return False

    # Suppress noisy logging for redirects
    def log_message(self, fmt, *args):
        if self.command in ("GET", "HEAD") and self.DATA_RE.match(self.path):
            return
        super().log_message(fmt, *args)


if __name__ == "__main__":
    # ── Parse "http" or "https" flag (unchanged) ───────────────────────────────
    arg = sys.argv[1].lower() if len(sys.argv) == 2 else "http"
    if arg not in {"http", "https"}:
        raise ValueError("Specify either HTTP or HTTPS")

    # ── Create the server ──────────────────────────────────────────────────────
    handler = partial(TibiaHandler, directory="client")
    httpd = http.server.HTTPServer(ADDRESS, handler)

    if arg == "https":
        httpd.socket = ssl.wrap_socket(
            httpd.socket,
            server_side=True,
            certfile="./ssl/localhost.crt",
            keyfile="./ssl/localhost.key",
            ssl_version=ssl.PROTOCOL_TLS,
        )

    scheme = "https" if arg == "https" else "http"
    print(f"Serving at {scheme}://{ADDRESS[0]}:{ADDRESS[1]}")
    httpd.serve_forever()
