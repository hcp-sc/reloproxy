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
from flask import Flask
from pathlib import Path
from werkzeug.serving import run_simple

StrPath: TypeAlias = Union[str, os.PathLike[str]]
FilePath: TypeAlias = Union[bytes, os.PathLike[bytes], StrPath]
FileDescriptorOrPath: TypeAlias = Union[int, bytes, os.PathLike[bytes], StrPath]

app: Flask = Flask(__name__)

UNIX_SOCKET_PATH: Path = Path(
  sys.argv[2] if len(sys.argv) > 2 else os.environ.get('RELOPROXY_SOCK', './reloproxy.sock')
).resolve()

IS_DEV: bool = os.environ.get('FLASK_ENV', 'production') == 'development'

@app.route('/')
def index() -> str:
  return "Welcome to reloproxy!"

def cleanup_socket(path: FilePath) -> None:
  if os.path.exists(path):
    os.remove(path)

def handle_sigint(signum: int, frame: Optional[Any]) -> None:
  cleanup_socket(UNIX_SOCKET_PATH)

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