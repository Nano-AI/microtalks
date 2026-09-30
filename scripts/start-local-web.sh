#!/bin/bash
set -euo pipefail
ROOT="${MICROTALKS_AI_DIR:-/Volumes/Extreme SSD/Microtalks}"
PROJECT="$(dirname "$(dirname "$(realpath "$0")")")"
test -x "$ROOT/runtime/voice-env/bin/python" || { printf 'Mount Extreme SSD first.\n' >&2; exit 1; }
export MICROTALKS_AI_DIR="$ROOT" HF_HOME="$ROOT/cache/huggingface" HF_HUB_OFFLINE=1
export PYTHONDONTWRITEBYTECODE=1 TMPDIR="$ROOT/tmp"
if ! curl -fsS --max-time 2 http://127.0.0.1:11435/api/version > /dev/null; then
  nohup bash "$PROJECT/scripts/start-local-ai.sh" > "$ROOT/results/ollama-server.log" 2>&1 &
  curl -fsS --retry 20 --retry-connrefused --retry-delay 1 http://127.0.0.1:11435/api/version > /dev/null
fi
npm --prefix "$PROJECT" run build
exec "$ROOT/runtime/voice-env/bin/python" "$PROJECT/scripts/local_server.py"
