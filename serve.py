"""Local server: this folder plus the exam PDFs in the sibling directory."""
from __future__ import annotations

import posixpath
import sys
import urllib.parse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PDF_ROOT = ROOT.parent / "Kontruktion FTW - Prüfungen"
PORT = 8765


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        path = path.split("?", 1)[0].split("#", 1)[0]
        try:
            path = urllib.parse.unquote(path, errors="surrogatepass")
        except UnicodeDecodeError:
            path = urllib.parse.unquote(path)
        trailing = path.endswith("/")
        path = posixpath.normpath(path)
        parts = [p for p in path.split("/") if p and p not in (".", "..")]
        if parts[:1] == ["pruefungen"]:
            base = PDF_ROOT
            rel = parts[1:]
        else:
            base = ROOT
            rel = parts
        base = base.resolve()
        target = base.joinpath(*rel).resolve() if rel else base
        try:
            target.relative_to(base)
        except ValueError:
            target = base
        out = str(target)
        if trailing and not out.endswith(("\\", "/")):
            out += "\\" if sys.platform == "win32" else "/"
        return out


def main() -> None:
    if not PDF_ROOT.is_dir():
        raise SystemExit(f"Exam PDF folder missing: {PDF_ROOT}")
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Site:  http://127.0.0.1:{PORT}/")
    print(f"PDFs:  {PDF_ROOT}")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
