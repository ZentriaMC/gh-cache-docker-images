#!/usr/bin/env bash
set -euo pipefail

docker image list --format '{{ .Repository }}:{{ .Tag }}'
