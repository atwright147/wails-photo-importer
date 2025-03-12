#!/bin/bash

set -e  # Exit immediately if a command exits with a non-zero status

# Create necessary directories
mkdir -p downloads
mkdir -p assets/nix

# Get the current ExifTool version
echo "Fetching current ExifTool version..."
VERSION=$(curl -s https://exiftool.org/ver.txt | tr -d '\r\n')
if [ -z "$VERSION" ]; then
	echo "Failed to retrieve version information"
	exit 1
fi
echo "Current ExifTool version: $VERSION"

# Download the tar.gz version (NIX)
NIX_URL="https://exiftool.org/Image-ExifTool-$VERSION.tar.gz"
NIX_FILE="downloads/Image-ExifTool-$VERSION.tar.gz"
echo "Downloading NIX (Unix/Linux) version from $NIX_URL..."
if curl -L -f -o "$NIX_FILE" "$NIX_URL"; then
	echo "Successfully downloaded NIX version to $NIX_FILE"
else
	echo "Failed to download NIX version from $NIX_URL"
	exit 1
fi

# Verify the file exists and has non-zero size before extraction
if [ ! -s "$NIX_FILE" ]; then
	echo "NIX file is empty or does not exist"
	exit 1
fi

# Extract the NIX (tar.gz) version to assets/nix without creating subdirectory
echo "Extracting NIX version to assets/nix..."
if tar -xzf "$NIX_FILE" --strip-components=1 -C assets/nix > /dev/null 2>&1; then
	echo "Successfully extracted NIX version to assets/nix"
else
	echo "Failed to extract NIX version"
	exit 1
fi

echo "NIX download and extraction completed successfully!"
