# Reloproxy
## What is reloproxy?
Reloproxy is a revolutionary dual flask-express app that is built to have the frontend and backend be controlled by node, with the flexibility of python on the static file side.

## Installtion (the long part)
Since this part is only consistent of unlicensed components, you may go grab a server for ultraviolet and stuff from the `uv-unix-socket` branch. To clone it do `git clone -b uv-unix-socket /path/to/reloproxy /path/to/reloproxy/uv`. Then you can just `cd /path/to/reloproxy/uv`, install deps with `npm i`, and run `npm start -- /path/to/reloproxy/uv.sock` for installing it. Then run npm start in this directory after installing python dependencies (`pip install -r requirements.txt`). If you get some error, try runnning it in a python venv. (to make & activate a venv run `python3 -m venv .venv && .venv/bin/activate`). Also remember to run `npm i` to install node dependencies. You can configure more in config.json.