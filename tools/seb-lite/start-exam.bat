@echo off
rem === Jalankan Mode Ujian (SEB-lite) ===
rem Prasyarat:
rem   1. sea-lock.ini sudah diisi (url + password) — lihat contoh-sealock.ini
rem   2. Jalankan file ini sebagai ADMINISTRATOR agar hook keyboard pasti jalan:
rem      klik kanan -> Run as administrator
setlocal
cd /d "%~dp0"

if not exist sea-lock.exe (
    echo [+] sea-lock.exe belum ada, kompilasi dulu...
    call build.bat
    if errorlevel 1 exit /b 1
)

if not exist sealock.ini (
    echo [!] sealock.ini tidak ditemukan. Salin contoh-sealock.ini jadi sealock.ini
    echo     lalu isi url dan password-nya.
    pause
    exit /b 1
)

echo [+] Mode ujian dimulai. Tekan Ctrl+Shift+U untuk membuka (butuh kode admin).
start "" sea-lock.exe
endlocal
