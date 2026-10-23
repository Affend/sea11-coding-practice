@echo off
rem === Kompilasi SEA Lock (SEB-lite) ===
rem Memakai csc.exe bawaan .NET Framework 4.x — tidak perlu install apa pun.
setlocal
cd /d "%~dp0"

set CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe
if not exist "%CSC%" set CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe
if not exist "%CSC%" (
    echo [!] .NET Framework 4.x tidak ditemukan. Windows normalnya sudah memilikinya.
    pause
    exit /b 1
)

echo [+] Kompilasi sea-lock.cs ...
"%CSC%" /nologo /target:winexe /optimize+ ^
    /r:System.dll /r:System.Core.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll ^
    /out:sea-lock.exe sea-lock.cs

if errorlevel 1 (
    echo [!] Kompilasi GAGAL.
    pause
    exit /b 1
)

echo [+] Sukses: sea-lock.exe dibuat.
endlocal
exit /b 0
