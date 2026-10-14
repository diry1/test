@echo off
cd /d "%~dp0"
py -3 --version >nul 2>&1
if not errorlevel 1 (
    py -3 start.py
    pause
    exit /b
)
python --version >nul 2>&1
if not errorlevel 1 (
    python start.py
    pause
    exit /b
)
echo Python 3 is required to run Car Spotter locally.
echo Install Python from https://www.python.org/downloads/windows/
echo Enable "Add python.exe to PATH" during installation, then reopen this launcher.
pause
