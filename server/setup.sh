#!/bin/bash
# ============================================================
# SmartFarm DakLak - Server Setup Script (Linux/macOS)
# ============================================================
# Prerequisites: Docker + Docker Compose installed
# ============================================================

set -e

echo ""
echo "========================================"
echo "  SmartFarm DakLak - Server Setup"
echo "========================================"
echo ""

cd "$(dirname "$0")"

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo "[ERROR] Docker is not running!"
    exit 1
fi

echo "[1/5] Starting Docker containers..."
docker compose up -d

echo ""
echo "[2/5] Waiting for services to initialize (15s)..."
sleep 15

echo ""
echo "[3/5] Checking service status..."
docker compose ps

echo ""
echo "[4/5] Importing Node-RED flows..."
echo "  NOTE: Import manually from http://localhost:1880"
echo "  File: server/config/node-red-flows.json"

echo ""
echo "[5/5] Importing Grafana alert rules..."
echo "  NOTE: Import manually via Grafana UI or API"
echo "  File: server/config/grafana/alerting/soil-alerts.json"

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "  Services:"
echo "    ChirpStack : http://localhost:8080  (admin/admin)"
echo "    Node-RED   : http://localhost:1880"
echo "    Grafana    : http://localhost:3000  (admin/admin)"
echo "    InfluxDB   : http://localhost:8086  (admin/admin12345)"
echo "    MQTT       : localhost:1883"
echo ""
echo "  Next steps:"
echo "    1. Change default passwords!"
echo "    2. Import Node-RED flows"
echo "    3. Configure Grafana InfluxDB datasource"
echo "    4. Register gateway + device in ChirpStack"
echo "    5. Import payload decoder into ChirpStack Device Profile"
echo ""
