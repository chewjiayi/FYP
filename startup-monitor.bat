@echo off
setlocal
set ROOT=%~dp0
set LOG=%ROOT%logs\startup-monitor.log
if not exist "%ROOT%logs" mkdir "%ROOT%logs"

:loop
call :runcheck
ping 127.0.0.1 -n 6 >nul
goto loop

:runcheck
for /f %%i in ('tasklist /FI "IMAGENAME eq node.exe" /NH ^| find /C /I "node.exe"') do set COUNT=%%i
if "%COUNT%"=="0" (
  echo [%DATE% %TIME%] Node process not found. Restarting application... >> "%LOG%"
  start "Kiosk App" cmd /k "node startAll.js"
)
exit /b 0
