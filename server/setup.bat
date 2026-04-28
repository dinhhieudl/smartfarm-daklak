@echo off
REM ============================================================
REM SmartFarm DakLak - Server Setup Script (Windows)
REM ============================================================
REM Prerequisites: Docker Desktop installed and running
REM ============================================================

echo.
echo  ========================================
echo   SmartFarm DakLak - Server Setup
echo  ========================================
echo.

cd /d "%~dp0"

REM Check Docker
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running! Please start Docker Desktop first.
    pause
    exit /b 1
)

echo [1/5] Starting Docker containers...
docker compose up -d
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start containers!
    pause
    exit /b 1
)

echo.
echo [2/5] Waiting for services to initialize (15s)...
timeout /t 15 /nobreak >nul

echo.
echo [3/5] Checking service status...
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo.
echo [4/5] Importing Node-RED flows...
echo   NOTE: Import manually from http://localhost:1880
echo   File: server/config/node-red-flows.json

echo.
echo [5/5] Importing Grafana alert rules...
echo   NOTE: Import manually via Grafana UI or API
echo   File: server/config/grafana/alerting/soil-alerts.json

echo.
echo  ========================================
echo   Setup Complete!
echo  ========================================
echo.
echo   Services:
echo     ChirpStack : http://localhost:8080  (admin/admin)
echo     Node-RED   : http://localhost:1880
echo     Grafana    : http://localhost:3000  (admin/admin)
echo     InfluxDB   : http://localhost:8086  (admin/admin12345)
echo     MQTT       : localhost:1883
echo.
echo   Next steps:
echo     1. Change default passwords!
echo     2. Import Node-RED flows
echo     3. Configure Grafana InfluxDB datasource
echo     4. Register gateway + device in ChirpStack
echo     5. Import payload decoder into ChirpStack Device Profile
echo.
pause
