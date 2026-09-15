@echo off
REM Double-click to start (or restart) the consultation demo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\demo-phone.ps1"
echo.
pause
