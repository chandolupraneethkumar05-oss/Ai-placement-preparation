@echo off
title AutoPlace AI - FastAPI Backend
echo Starting AutoPlace AI Backend Server on http://127.0.0.1:8000 ...
cd backend
python -m uvicorn main:app --reload --port 8000
pause
