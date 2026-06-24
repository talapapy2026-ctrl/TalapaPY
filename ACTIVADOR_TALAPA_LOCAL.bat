@echo off
title TALAPA BURGER - Servidor Local (5173)
color 0E
echo.
echo  ============================================
echo   TALAPA BURGER - Restaurante Local
echo  ============================================
echo.

:: Liberar puerto 5173 si está en uso
echo  Liberando puerto 5173 si esta ocupado...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":5173 "') do (
    echo Matando proceso con PID %%a en puerto 5173...
    taskkill /f /pid %%a 2>nul
)

echo.
echo  Servidor local: http://localhost:5173
echo  Admin Panel:    http://localhost:5173/admin
echo.
echo  Iniciando servidor de desarrollo...
echo.

cd /d "c:\Users\Usuario\.antigravity\talapa"

:: Abrir el panel de administrador en el navegador automáticamente después de 3 segundos
start "" cmd /c "timeout /t 3 >nul && start http://localhost:5173/admin"

:: Iniciar servidor Vite en puerto 5173 con acceso de red externa
npx vite --port 5173 --strictPort --host

pause
