#!/bin/bash
# Setup script for ewluong.os rebuild
# Run this from the rebuild/ directory

set -e

echo "=== ewluong.os setup ==="

# Copy assets from old site
echo "Copying audio files..."
cp ../docs/sample.mp3 public/audio/
cp ../docs/sample2.mp3 public/audio/
cp ../docs/sample3.mp3 public/audio/
cp ../docs/sample4.mp3 public/audio/

echo "Copying font..."
cp ../VT323-Regular.ttf public/fonts/

echo "Copying documents..."
cp ../docs/amazon.pdf public/docs/
cp ../docs/comp_centrality.pdf public/docs/
cp ../docs/sudoku.pdf public/docs/
cp ../docs/nba.pdf public/docs/
cp ../docs/network.md public/docs/
cp ../docs/housing.md public/docs/
cp ../docs/woolridge.html public/docs/

echo "Copying backrooms data..."
cp ../docs/backrooms1.txt public/backrooms/
cp ../docs/backrooms2.txt public/backrooms/
cp ../docs/backrooms3.txt public/backrooms/

echo "Copying favicon..."
cp ../favicon.ico public/ 2>/dev/null || echo "No favicon found, skipping"

echo "Installing dependencies..."
npm install

echo ""
echo "=== Setup complete ==="
echo "Run 'npm run dev' to start the development server"
