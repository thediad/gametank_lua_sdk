#!/data/data/com.termux/files/usr/bin/bash

if [ -z "$1" ]; then
    echo "Usage: ./mobile-test.sh path/to/main.lua"
    exit 1
fi

if ! node bin/gtlua.js build "$1"; then
    echo
    echo "Build failed."
    exit 1
fi

ROM="${1%.lua}.gtr"

echo
echo "Build complete:"
echo "$ROM"

if [ -d "$HOME/storage/downloads" ]; then
    cp "$ROM" "$HOME/storage/downloads/"
    echo
    echo "Copied to Android Downloads:"
    echo "$HOME/storage/downloads/$(basename "$ROM")"
fi
