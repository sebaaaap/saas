@echo off
setlocal enabledelayedexpansion

:: --- Correr en su propia carpeta ---
cd /d "%~dp0"

echo ==============================================================
echo        INICIANDO EL SISTEMA VANKAY (MODO INTELIGENTE)
echo ==============================================================

:: 1. Verificar actualizaciones de Git
echo Verificando si hay cambios en la nube...
git fetch origin main >nul 2>&1

:: Comparamos la version local con la del servidor
for /f %%i in ('git rev-parse HEAD') do set LOCAL=%%i
for /f %%i in ('git rev-parse @{u}') do set REMOTE=%%i

if "%LOCAL%"=="%REMOTE%" (
    echo [OK] El sistema ya esta actualizado.
    :: Solo levantamos (Super rapido)
    docker-compose up -d >nul 2>&1
) else (
    echo [NUEVO] Se encontro una actualizacion. Descargando y aplicando...
    git pull origin main >nul 2>&1
    :: Forzamos el build porque hay cambios de codigo
    docker-compose up -d --build >nul 2>&1
)

if %errorlevel% neq 0 (
    msg * "Error al iniciar el sistema. Asegurese de que Docker Desktop este abierto."
    exit /b 1
)

:: 2. Esperar al puerto 3000 de forma inteligente
echo Abriendo interfaz grafica...
for /L %%i in (1,1,15) do (
    powershell -Command "Test-NetConnection localhost -Port 3000" | find "TcpTestSucceeded : True" >nul
    if !errorlevel! equ 0 (
        goto :abrir_navegador
    )
    timeout /t 1 /nobreak >nul
)

:abrir_navegador
:: 3. Abrir Chrome en pantalla completa
set URL=http://localhost:3000/login

set CHROME1="%ProgramFiles%\Google\Chrome\Application\chrome.exe"
set CHROME2="%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
set CHROME3="%LocalAppData%\Google\Chrome\Application\chrome.exe"

if exist %CHROME1% (
    start "" %CHROME1% --start-fullscreen "%URL%"
    goto :fin
)
if exist %CHROME2% (
    start "" %CHROME2% --start-fullscreen "%URL%"
    goto :fin
)
if exist %CHROME3% (
    start "" %CHROME3% --start-fullscreen "%URL%"
    goto :fin
)

start %URL%

:fin
exit
