#!/usr/bin/env bash
#
# scripts/download-tts-model.sh
#
# Downloads Supertonic TTS model assets from HuggingFace into the WebUI's
# public/ tree so they're served same-origin (HF blocks cross-origin fetches
# via CORS — see ROADMAP.md "TTS conversation readout").
#
# Idempotent: skips files already present and non-empty.
# Override target via: TARGET_DIR=/custom/path ./scripts/download-tts-model.sh
# Override mirror via: BASE_URL=https://your.cdn/supertonic-3 ./scripts/...

set -euo pipefail

TARGET="${TARGET_DIR:-src/client/public/tts}"
BASE="${BASE_URL:-https://huggingface.co/Supertone/supertonic-3/resolve/main}"

files=(
  "README.md"
  "LICENSE"
  "config.json"
  "onnx/tts.json"
  "onnx/unicode_indexer.json"
  "onnx/duration_predictor.onnx"
  "onnx/text_encoder.onnx"
  "onnx/vocoder.onnx"
  "onnx/vector_estimator.onnx"
)

voices=(M1 M2 M3 M4 M5 F1 F2 F3 F4 F5)

mkdir -p "$TARGET/onnx" "$TARGET/voice_styles"

echo "↓ Supertonic model → $TARGET"
echo "  base: $BASE"
echo

for f in "${files[@]}"; do
  dest="$TARGET/$f"
  if [[ -s "$dest" ]]; then
    echo "  ✓ $f (cached)"
    continue
  fi
  echo "  ↓ $f"
  curl -sSfL --retry 3 --retry-delay 2 -o "$dest" "$BASE/$f"
done

for v in "${voices[@]}"; do
  dest="$TARGET/voice_styles/${v}.json"
  if [[ -s "$dest" ]]; then
    echo "  ✓ voice_styles/${v}.json (cached)"
    continue
  fi
  if curl -sSfL --retry 2 -o "$dest" "$BASE/voice_styles/${v}.json"; then
    echo "  ↓ voice_styles/${v}.json"
  else
    rm -f "$dest"
    echo "  ⚠ voice_styles/${v}.json — not found, skipping"
  fi
done

echo
echo "Done. Total size:"
du -sh "$TARGET"
