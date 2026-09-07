#!/usr/bin/env python3
"""
Servidor local para servir el frontend de Bar INTESUD en desarrollo.

Uso:
    cd frontend
    python server.py

Luego abre: http://localhost:8080
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

PORT = 8080
SCRIPT_DIR = Path(__file__).resolve().parent

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SCRIPT_DIR), **kwargs)
    
    def end_headers(self):
        """Agregar headers para evitar caché agresivo en desarrollo."""
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def do_GET(self):
        """Redirigir todas las rutas a index.html para SPA."""
        if self.path == '/' or not Path(SCRIPT_DIR / self.path.lstrip('/')).exists():
            self.path = '/index.html'
        return super().do_GET()


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

if __name__ == '__main__':
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    os.chdir(SCRIPT_DIR)
    Handler = MyHTTPRequestHandler
    
    try:
        with ReusableTCPServer(("", PORT), Handler) as httpd:
            print(f"✓ Frontend server corriendo en: http://localhost:{PORT}")
            print(f"✓ Backend esperado en: http://127.0.0.1:8000")
            print(f"✓ Presiona Ctrl+C para detener")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n✓ Servidor detenido")
        sys.exit(0)
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"✗ Puerto {PORT} ya en uso. Intenta con otro puerto o cierra la otra aplicación.")
        else:
            print(f"✗ Error: {e}")
        sys.exit(1)
