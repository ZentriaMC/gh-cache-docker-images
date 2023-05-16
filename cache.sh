#!/usr/bin/env bash
set -euo pipefail

dump_image () {
    local destdir="${1}"
    local image="${2}"
    local hash="$(openssl dgst -sha256 -hex <<< "${image}" | sed 's/^.*=\s\(.\+\)$/\1/')"

    if [ -f "${destdir}/${hash}.tar.meta" ]; then
        return 0
    fi

    mkdir -p "${destdir}"
    docker image save "${image}" --output "${destdir}/${hash}.tar"
    echo "${image}" > "${destdir}/${hash}.tar.meta"
}

cachedir="./cache"
images=($(docker image list --format '{{ .Repository }}:{{ .Tag }}'))

for image in "${images[@]}"; do
    dump_image "${cachedir}" "${image}"
done
