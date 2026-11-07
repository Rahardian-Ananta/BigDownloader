Write-Host "=== Membangun Windows Portable Executable BIG Downloader ===" -ForegroundColor Cyan

# Pastikan profile release dengan optimasi LTO dan strip
cargo build --release

$targetExe = "target\release\big-downloader.exe"
$distDir = "dist\BIGDownloader-Windows-Portable"

if (Test-Path $targetExe) {
    if (-not (Test-Path $distDir)) {
        New-Item -ItemType Directory -Force -Path $distDir | Out-Null
    }

    Copy-Item $targetExe -Destination "$distDir\BIGDownloader.exe" -Force
    Copy-Item "README.md" -Destination "$distDir\README.txt" -Force
    Copy-Item "LICENSE" -Destination "$distDir\LICENSE.txt" -Force

    Write-Host "Berhasil! Executable portable telah dibuat di: $distDir\BIGDownloader.exe" -ForegroundColor Green
    Write-Host "Ukuran file: $((Get-Item "$distDir\BIGDownloader.exe").Length / 1MB) MB"
} else {
    Write-Error "Gagal menemukan binary target di $targetExe"
}

