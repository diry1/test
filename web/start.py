"""Start Car Spotter on this computer; no third-party packages needed."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
import threading
import webbrowser

PORT = 8000
handler = partial(SimpleHTTPRequestHandler, directory=str(Path(__file__).resolve().parent))
try:
    server = ThreadingHTTPServer(('127.0.0.1', PORT), handler)
except OSError as error:
    print(f'Could not start Car Spotter: {error}')
    print('Port 8000 may already be used. Close the other server and try again.')
    input('Press Enter to close…')
    sys.exit(1)
url = f'http://localhost:{PORT}'
print(f'Car Spotter is running at {url}', flush=True)
print('Keep this window open. Press Ctrl+C to stop.', flush=True)
threading.Timer(0.5, lambda: webbrowser.open(url)).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
