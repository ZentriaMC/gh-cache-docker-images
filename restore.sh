#!/usr/bin/env bash
set -euo pipefail

cachedir="./cache"

for archive_meta in "${cachedir}"/*.tar.meta; do
    image_tag="$(< "${archive_meta}")"

    if (docker image inspect --format '{{ .Id }}' "${image_tag}" >/dev/null); then
        continue
    fi

    archive="${archive_meta/\.meta/}"
    docker image load < "${archive}"
done
