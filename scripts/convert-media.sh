#!/usr/bin/env bash
# Convierte los GIFs del catálogo de GymMane a MP4 H.264.
#
# Un GIF animado es un formato de 1987: sin compresión temporal, sin audio, y
# pesado. El mismo contenido en H.264 baja un orden de magnitud con mejor
# calidad de imagen. En una app que se abre con 4G de gimnasio, eso se nota.
#
# Uso: scripts/convert-media.sh [dir-gifs] [dir-salida]
set -euo pipefail

SRC="${1:-../GymMane/assets/gifs}"
OUT="${2:-media/catalog}"

command -v ffmpeg >/dev/null || { echo "Falta ffmpeg"; exit 1; }
[ -d "$SRC" ] || { echo "No existe $SRC"; exit 1; }

mkdir -p "$OUT"

convert_one() {
  local gif="$1" out="$2"
  local base
  base=$(basename "$gif" .gif)
  ffmpeg -y -loglevel error -i "$gif" \
    -movflags +faststart -pix_fmt yuv420p -c:v libx264 -crf 28 -preset slow \
    -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -an \
    "$out/$base.mp4"
}
export -f convert_one

find "$SRC" -name '*.gif' -print0 \
  | xargs -0 -P 8 -I{} bash -c 'convert_one "$@"' _ {} "$OUT"

echo
echo "GIF origen : $(find "$SRC" -name '*.gif' | wc -l | tr -d ' ') archivos, $(du -sh "$SRC" | cut -f1)"
echo "MP4 salida : $(find "$OUT" -name '*.mp4' | wc -l | tr -d ' ') archivos, $(du -sh "$OUT" | cut -f1)"
