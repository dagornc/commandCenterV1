#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
command -v node >/dev/null 2>&1 || { echo 'Node.js 20 ou supérieur est requis.' >&2; exit 1; }
exec node "$ROOT/DIAMANTS_FRONTEND/Mission_system/scripts/start-stack.mjs" "$@"
