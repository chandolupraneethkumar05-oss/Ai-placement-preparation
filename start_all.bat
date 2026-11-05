@echo off
title AutoPlace AI - Full Stack Launcher
echo ================================================================
echo    VFSTR AutoPlace AI - Campus Placement Management Agent
echo ================================================================
echo Starting FastAPI Backend and React Frontend simultaneously...
start run_backend.bat
timeout /t 3 /nobreak > nul
start run_frontend.bat
echo Both services are running!
echo Backend Swagger API Docs: http://127.0.0.1:8000/docs
echo Frontend Web Dashboard:   http://localhost:5173
pause
