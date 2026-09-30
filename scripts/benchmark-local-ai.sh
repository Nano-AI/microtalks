#!/bin/bash
set -euo pipefail
ROOT="${MICROTALKS_AI_DIR:-/Volumes/Extreme SSD/Microtalks}"
if [[ ! -x "$ROOT/runtime/voice-env/bin/python" ]]; then
  printf 'Mount the SSD first. Missing voice runtime: %s\n' "$ROOT/runtime/voice-env/bin/python" >&2
  exit 1
fi
export MICROTALKS_AI_DIR="$ROOT"
export HF_HOME="$ROOT/cache/huggingface"
export HF_HUB_OFFLINE=1
export UV_CACHE_DIR="$ROOT/cache/uv"
export PYTHONDONTWRITEBYTECODE=1
export TMPDIR="$ROOT/tmp"
exec "$ROOT/runtime/voice-env/bin/python" "$(dirname "$0")/benchmark_local_ai.py" "${1:-text}"
