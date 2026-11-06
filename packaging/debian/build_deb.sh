#!/bin/bash
set -e

echo "=== Membangun Paket Debian (.deb) BIG Downloader ==="

# Periksa apakah cargo-deb terpasang
if ! command -v cargo-deb &> /dev/null; then
    echo "cargo-deb tidak ditemukan. Memasang cargo-deb..."
    cargo install cargo-deb
fi

# Build release binary
echo "Kompilasi release binary..."
cargo build --release

# Buat paket deb
echo "Membuat paket deb..."
cargo deb --no-build

echo "=== Selesai! Paket Debian tersimpan di target/debian/ ==="
