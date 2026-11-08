@echo off
rem COT Report Hub - avvio per Windows (doppio click)
setlocal
cd /d "%~dp0"
set PORT=5050
title COT Report Hub

set PY=
where py >nul 2>nul && set PY=py -3
if "%PY%"=="" (where python >nul 2>nul && set PY=python)
if "%PY%"=="" (
  echo Python 3 non trovato. Installalo da https://www.python.org/downloads/ ^(spunta "Add Python to PATH"^) e riprova.
  pause
  exit /b 1
)

if not exist venv-win\Scripts\python.exe (
  echo Creo l'ambiente virtuale ^(solo la prima volta^)...
  %PY% -m venv venv-win
  if errorlevel 1 ( echo Errore nella creazione del venv. & pause & exit /b 1 )
)

echo Controllo le dipendenze...
venv-win\Scripts\python.exe -m pip install -q --disable-pip-version-check -r requirements.txt
if errorlevel 1 ( echo Errore installazione dipendenze. & pause & exit /b 1 )

start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:%PORT%"
echo COT Report Hub in esecuzione su http://localhost:%PORT%  ^(chiudi questa finestra per fermarlo^)
venv-win\Scripts\python.exe app.py
pause
