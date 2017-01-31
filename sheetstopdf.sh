#!/bin/bash

if [ $# -eq 0 ]
then
    echo "Convert svgs in a folder to pdfs for printing to a4 sized paper."
    echo "Usage: sh sheets svg_dir"
    exit 1
fi

SVG_DIR="$1"

echo "Cropping svgs and exporting to pdf..."

for filename in "$SVG_DIR"/*.svg; do
    [ -f "$filename" ] || continue
    prefix="${filename%.*}"
    inkscape --verb=FitCanvasToDrawing --verb=FileSave --verb=FileClose  "$filename" & inkscape -f "$filename" -A "$prefix".pdf
done

echo "Tiling pdfs to a4..."

for filename in "$SVG_DIR"/*.pdf; do
    [ -f "$filename" ] || continue
    pdfposter -s1 "$filename" fooo.pdf
done

echo "Done"

exit 0
