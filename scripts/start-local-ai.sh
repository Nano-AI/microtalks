#!/bin/bash
set -euo pipefail
ROOT="${MICROTALKS_AI_DIR:-/Volumes/Extreme SSD/Microtalks}"
if [[ ! -d "$ROOT/models/ollama" ]]; then
  printf 'Mount the Extreme SSD first. Missing model directory: %s\n' "$ROOT/models/ollama" >&2
  exit 1
fi
export OLLAMA_HOST="127.0.0.1:11435"
export OLLAMA_MODELS="$ROOT/models/ollama"
export OLLAMA_NUM_PARALLEL=1
export OLLAMA_MAX_LOADED_MODELS=1
export OLLAMA_CONTEXT_LENGTH=4096
export OLLAMA_NO_CLOUD=1
export TMPDIR="$ROOT/tmp"
printf 'Serving SSD models at http://%s (Ctrl+C to stop)\n' "$OLLAMA_HOST"
exec /usr/local/bin/ollama serve
