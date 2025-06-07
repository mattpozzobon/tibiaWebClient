from __future__ import annotations

import http.server
import json
import os
import re
import ssl
import sys
from functools import partial
from urllib.error import HTTPError, URLError
from urllib.parse import quote, parse_qs, urlparse
from urllib.request import Request, urlopen
from dotenv import load_dotenv         

load_dotenv()                            

ASSET_BASE =    ("https://pub-731c9162b7da4ead9743fb831880fd77.r2.dev/data")
ADDRESS:        tuple[str, int] = ("127.0.0.1", 8000)
DATA_RE =       re.compile(r"^/data/(sprites|sounds)/(.+)$", re.I)


class TibiaHandler(http.server.SimpleHTTPRequestHandler):

    def _maybe_redirect(self) -> bool:
        m = DATA_RE.match(self.path)
        if not m:
            return False

        # m.group(1) is "sprites" or "sounds"
        # m.group(2) is the rest of the path
        key = f"{m.group(1)}/{m.group(2)}"
        target = f"{ASSET_BASE}/{quote(key)}"
        self.send_response(302)
        self.send_header("Location", target)
        self.end_headers()
        return True

    def log_message(self, fmt: str, *args):
        if self.command in ("GET", "HEAD") and DATA_RE.match(self.path):
            return
        super().log_message(fmt, *args)

    def do_GET(self):
        if self.path.startswith("/api/changelog"):
            self._serve_changelog()
            return
        if self._maybe_redirect():
            return
        super().do_GET()

    def do_HEAD(self):
        if self.path.startswith("/api/changelog"):
            self.send_error(405, "HEAD not available for this endpoint")
            return
        if self._maybe_redirect():
            return
        super().do_HEAD()

    def _serve_changelog(self):
        bot_token   = os.getenv("DISCORD_BOT_TOKEN")
        channel_id  = os.getenv("DISCORD_CHANGELOG_CHANNEL_ID")

        if (not bot_token or not channel_id) and "?" in self.path:
            qs = parse_qs(urlparse(self.path).query)
            bot_token  = bot_token  or qs.get("token",   [None])[0]
            channel_id = channel_id or qs.get("channel", [None])[0]

        if not bot_token or not channel_id:
            self._send_json(500, {
                "error": "Server mis-config: set DISCORD_BOT_TOKEN and DISCORD_CHANGELOG_CHANNEL_ID"
            })
            return

        url = f"https://discord.com/api/v10/channels/{channel_id}/messages?limit=10"
        req = Request(url, headers={
            "Authorization": f"Bot {bot_token}",
            "Content-Type":  "application/json",
            "User-Agent":    "TibiaWebClient/ChangelogProxy"
        })

        try:
            with urlopen(req, timeout=10) as resp:
                full = json.loads(resp.read().decode("utf-8"))
                # here we send the full raw Discord JSON (author, embeds, etc)
                self._send_json(200, full)

        except HTTPError as e:
            self._send_json(e.code, {"error": f"HTTPError {e.code}"})
        except URLError as e:
            self._send_json(502, {"error": f"Failed to reach Discord API: {e.reason}"})
        except Exception as e:
            self._send_json(500, {"error": str(e)})

    def _send_json(self, status: int, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    
    def end_headers(self):
        # if the request was for anything in /png/, tell browsers:
        #   • public       → shared caches too
        #   • max-age=1y   → 365 days
        #   • immutable    → “I promise this file will never change”
        if self.path.startswith('/png/'):
            self.send_header(
                'Cache-Control',
                'public, max-age=31536000, immutable'
            )
        else:
            # default: no caching
            self.send_header(
                'Cache-Control',
                'no-store, no-cache, must-revalidate, max-age=0'
            )
        super().end_headers()


def main() -> None:
    mode = sys.argv[1].lower() if len(sys.argv) == 2 else "http"
    if mode not in {"http", "https"}:
        raise ValueError("Usage: python tibia_server.py [http|https]")

    handler = partial(TibiaHandler, directory="client")
    httpd   = http.server.HTTPServer(ADDRESS, handler)

    if mode == "https":
        httpd.socket = ssl.wrap_socket(
            httpd.socket,
            server_side=True,
            certfile="./ssl/localhost.crt",
            keyfile="./ssl/localhost.key",
            ssl_version=ssl.PROTOCOL_TLS,
        )

    scheme = "https" if mode == "https" else "http"
    print(f"Serving at {scheme}://{ADDRESS[0]}:{ADDRESS[1]}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down…")
        httpd.server_close()

if __name__ == "__main__":
    main()
