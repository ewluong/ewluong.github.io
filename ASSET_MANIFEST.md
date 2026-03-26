# Asset Manifest

Files to copy from the old site into the rebuild's `public/` directory:

## Audio (public/audio/)
- docs/sample.mp3 -> public/audio/sample.mp3
- docs/sample2.mp3 -> public/audio/sample2.mp3
- docs/sample3.mp3 -> public/audio/sample3.mp3
- docs/sample4.mp3 -> public/audio/sample4.mp3

## Fonts (public/fonts/)
- VT323-Regular.ttf -> public/fonts/VT323-Regular.ttf

## Documents (public/docs/)
- docs/amazon.pdf -> public/docs/amazon.pdf
- docs/comp_centrality.pdf -> public/docs/comp_centrality.pdf
- docs/sudoku.pdf -> public/docs/sudoku.pdf
- docs/nba.pdf -> public/docs/nba.pdf
- docs/network.md -> public/docs/network.md
- docs/housing.md -> public/docs/housing.md
- docs/woolridge.html -> public/docs/woolridge.html

## Backrooms Data (public/backrooms/)
- docs/backrooms1.txt -> public/backrooms/backrooms1.txt
- docs/backrooms2.txt -> public/backrooms/backrooms2.txt
- docs/backrooms3.txt -> public/backrooms/backrooms3.txt

## Domain Config (public/)
- CNAME -> public/CNAME (contains: ewluong.com)
- favicon.ico -> public/favicon.ico

## Images (NOT carried forward by default)
The about-section grid images (work.webp, bitcoin.webp, book.webp, etc.) are tied to the old portfolio layout which is being cut. They should NOT be copied unless specifically needed for a new purpose.

The vibe.mp4 video may be useful for the visualizer module in a future phase.
