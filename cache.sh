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

find_in_array() {
  local word="${1}"
  shift

  for elem in "${@}"; do
      if [ "${elem}" = "${word}" ]; then
          return 0
      fi
  done

  return 1
}

ignored_images_file="${1:-}"
cachedir="./cache"

images=($(docker image list --format '{{ .Repository }}:{{ .Tag }}'))

ignored_images=()
test -f "${ignored_images_file}" && mapfile -t ignored_images < "${ignored_images_file}"

for image in "${images[@]}"; do
    if (( ${#ignored_images[@]} )) && find_in_array "${image}" "${ignored_images[@]}"; then
        echo ">>> Ignoring image '${image}'"
        continue
    fi

    echo ">>> Caching image '${image}'"
    dump_image "${cachedir}" "${image}"
done
