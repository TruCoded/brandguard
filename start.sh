#!/usr/bin/env bash
# One-command start. Builds the frontend if Node is available and it has not been built yet.
set -e
[ -d .venv ] || python3 -m venv .venv
. .venv/bin/activate
pip install -q -r requirements.txt
if [ ! -d frontend/out ] && command -v npm >/dev/null; then (cd frontend && npm install --no-audit --no-fund && npm run build); fi
uvicorn app.main:app --port 8000
