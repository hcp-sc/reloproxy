#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
"""
This is a flask app that is meant to be used with express as a real backend.
while still having the fake backend of express.
"""
import os
import sys
import signal
from typing import Any, Optional, Union, TypeAlias
from flask import Flask, render_template
from pathlib import Path
from werkzeug.serving import run_simple
from werkzeug.exceptions import HTTPException

StrPath: TypeAlias = Union[str, os.PathLike[str]]
FilePath: TypeAlias = Union[bytes, os.PathLike[bytes], StrPath]
FileDescriptorOrPath: TypeAlias = Union[int, bytes, os.PathLike[bytes], StrPath]

app: Flask = Flask(
  __name__,
  template_folder='templates',
  static_folder='static',
  static_url_path='/'
)

UNIX_SOCKET_PATH: Path = Path(
  sys.argv[2] if len(sys.argv) > 2 else os.environ.get('RELOPROXY_SOCK', './reloproxy.sock')
).resolve()

IS_DEV: bool = os.environ.get('FLASK_ENV', 'production') == 'development'

@app.route('/')
def index() -> str:
  return render_template('index.html')

@app.errorhandler(HTTPException)  # pyright: ignore[reportUntypedFunctionDecorator, reportArgumentType]
def handle_http_exception(e: HTTPException) -> tuple[str,Union[int,None]]:
  print(dir(e))
  return render_template('error.html', error = e), e.code

def cleanup_socket(path: FilePath) -> None:
  if os.path.exists(path):
    os.remove(path)

def handle_sigint(signum: int, frame: Optional[Any]) -> None:
  try:
    cleanup_socket(UNIX_SOCKET_PATH)
  except:
    exit(1)
  exit(0)


if __name__ == '__main__':
  cleanup_socket(UNIX_SOCKET_PATH)
  
  signal.signal(signal.SIGINT, handle_sigint)
  signal.signal(signal.SIGTERM, handle_sigint)
  signal.signal(signal.SIGHUP, handle_sigint)

  print(f"Starting Flask on unix://{UNIX_SOCKET_PATH}")

  run_simple(
    hostname=f'unix://{UNIX_SOCKET_PATH}',
    port=0, # unix sockets dont have ports
    application=app,
    use_reloader=IS_DEV,
    use_debugger=IS_DEV,
    use_evalex=IS_DEV,
  )