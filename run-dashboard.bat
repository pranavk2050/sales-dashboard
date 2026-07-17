@echo off
setlocal
cd /d "%~dp0"

if not exist "backend\.venv\Scripts\python.exe" (
    echo Backend virtual environment not found. Run this first:
    echo   cd backend ^&^& py -m venv .venv ^&^& .venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)

if not exist "frontend\node_modules" (
    echo Frontend dependencies not installed. Run this first:
    echo   cd frontend ^&^& npm install
    pause
    exit /b 1
)

echo Starting backend on http://0.0.0.0:8000 ...
start "Sales Dashboard - Backend" cmd /k "cd /d "%~dp0backend" && .venv\Scripts\python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo Starting frontend on http://0.0.0.0:5173 ...
start "Sales Dashboard - Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Both servers are starting in their own windows, listening on all network interfaces.
echo On this machine:        http://localhost:5173
for /f "delims=" %%a in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1 -ExpandProperty IPAddress)"') do set LANIP=%%a
if defined LANIP echo From other machines:    http://%LANIP%:5173
echo Close those windows (or Ctrl+C in each) to stop them.
echo If other machines still can't connect, check Windows Firewall allows inbound TCP 8000 and 5173.
endlocal
