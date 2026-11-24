#!/bin/sh
set -eu
curl -fsS "http://localhost:${PORT:-8080}/api/health/ready" >/dev/null
