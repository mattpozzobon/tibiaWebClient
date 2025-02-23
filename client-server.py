import http.server
import ssl
import sys
from functools import partial

if __name__ == "__main__":
    """
    HTTP(S) Webserver in Python that serves the required assets for the HTML5 Client
    """

    # Address where the resources are hosted
    ADDRESS = ("127.0.0.1", 8000)

    # Parse input
    if len(sys.argv) == 1:
        argument = "http"
    elif len(sys.argv) == 2:
        argument = sys.argv[1].lower()
    else:
        raise ValueError("Unknown arguments specified")

    # Validate argument
    if argument not in ["http", "https"]:
        raise ValueError("Specify either HTTP or HTTPS")

    # Serve from the `dist/` directory (where Webpack outputs files)
    requestHandler = partial(http.server.SimpleHTTPRequestHandler, directory="client")

    # Create the server
    httpd = http.server.HTTPServer(ADDRESS, requestHandler)

    # Wrap HTTP socket in SSL using specified certfiles if HTTPS is enabled
    if argument == "https":
        httpd.socket = ssl.wrap_socket(
            httpd.socket,
            server_side=True,
            certfile="./ssl/localhost.crt",
            keyfile="./ssl/localhost.key",
            ssl_version=ssl.PROTOCOL_TLS
        )

    print(f"Serving at http://{ADDRESS[0]}:{ADDRESS[1]}")
    httpd.serve_forever()
