#!/bin/bash

# Script to download artist images from Spotify CDN
# Run this from the mock-data directory

mkdir -p images
cd images

echo "Downloading artist images..."

# RADWIMPS
curl -sL "https://i.scdn.co/image/ab6761610000f178f7374b42bee7c71b9649ac83" -o "1EowJ1WwkMzkCkRomFhui7.jpg"
echo "✓ RADWIMPS"

# Radiohead
curl -sL "https://i.scdn.co/image/ab6761610000f1784104fbd80f1f795728abbd59" -o "4Z8W4fKeB5YxbusRsdQVPb.jpg"
echo "✓ Radiohead"

# Radio Company
curl -sL "https://i.scdn.co/image/ab67616d00004851d322f73e0d23621cdc9c9aee" -o "3qBdT7NKSOBogHhGiUVLiV.jpg"
echo "✓ Radio Company"

# Rad Cat
curl -sL "https://i.scdn.co/image/ab6761610000f178953c0a6b1c03983232034672" -o "4wrWMxa1wnZX5ZDhV6qk6f.jpg"
echo "✓ Rad Cat"

# The Radio Dept.
curl -sL "https://i.scdn.co/image/ab6761610000f178761a16ffa877c8086e28c5b0" -o "0utS63XytOEVN1EtzWhJpG.jpg"
echo "✓ The Radio Dept."

# Radical Face
curl -sL "https://i.scdn.co/image/ab6761610000f17887eaaabcb2bf631817380188" -o "5EM6xJN2QNk0cL7EEm9HR9.jpg"
echo "✓ Radical Face"

# Radiator Hospital
curl -sL "https://i.scdn.co/image/ab6761610000f17892d7cfdbbb7cca476a9700d6" -o "0HMLp79IAd9Z8zMgxqpyxn.jpg"
echo "✓ Radiator Hospital"

# Radical For Christ
curl -sL "https://i.scdn.co/image/ab67616d000048517ea59a38a40063c530c6799e" -o "5IasY9qIMVuTssFl6ECzKA.jpg"
echo "✓ Radical For Christ"

# Radio Free Alice
curl -sL "https://i.scdn.co/image/ab6761610000f1783c962edcee32ef23ddbb83fc" -o "4cCA6V2DRIDqeYDyGIcEoj.jpg"
echo "✓ Radio Free Alice"

# White Noise Radiance
curl -sL "https://i.scdn.co/image/ab6761610000f178a9ee173e9fbacd3273fe5381" -o "0QUBaF6Rtta4TTmxYYfzux.jpg"
echo "✓ White Noise Radiance"

echo ""
echo "Done! Downloaded $(ls -1 *.jpg 2>/dev/null | wc -l) images to ./images/"
ls -la