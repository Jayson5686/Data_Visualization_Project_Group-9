@echo off
echo ========================================================
echo   Starting CrashMetrics Australia Data Visualisation App
echo ========================================================
echo.
echo Launching local server at http://localhost:8000 ...
echo Press Ctrl+C in this window when you want to stop the app.
echo.

REM Try to open the default browser after 1 second in the background
start "" cmd /c "timeout /t 1 /nobreak >nul && start http://localhost:8000/index.html?dashboard=1"

REM Start Python built-in HTTP server
python -m http.server 8000

pause
