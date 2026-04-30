# SmartFarm DakLak - Knowledge Base

LoRaWAN-based precision agriculture system for DakLak, Vietnam.

## Hardware Inventory

| Component | Model | Role | Status |
|-----------|-------|------|--------|
| Gateway | E870-L915LG12 | LoRaWAN concentrator | ✅ Đã có |
| Node (LoRaWAN) | **E78-DTU(900LN22)** | LoRaWAN node (RS485 bridge) | ✅ Đã có |
| Node (Raw LoRa) | E90-DTU(900SL22) | LoRa data radio (备用) | ✅ Đã có |
| Sensor | Soil Multi-Parameter (Temp/Moisture/EC/NPK/pH) | Field data采集 | ✅ Đã có |

## Quick Start

```bash
# 1. Clone
git clone https://github.com/dinhhieudl/smartfarm-daklak.git
cd smartfarm-daklak

# 2. Server stack (bao gồm Smart Control)
cd server && docker compose up -d && cd ..

# 3. Simulator
cd simulator && npm install && npm start
# → Mở http://localhost:3001

# 4. Smart Control & Advisory (nếu chạy standalone)
cd smart-control && npm install && npm start
# → Mở http://localhost:3002
```

### Truy cập các dịch vụ

| Service | URL | Mô tả |
|---------|-----|-------|
| **Smart Control** | http://localhost:3002 | 🎛️ Điều khiển bơm/van + Tư vấn thông minh |
| **Simulator** | http://localhost:3001 | 📊 Mô phỏng dữ liệu cảm biến |
| **ChirpStack** | http://localhost:8080 | 📡 LoRaWAN Network Server |
| **Node-RED** | http://localhost:1880 | 🔄 Data Processing |
| **Grafana** | http://localhost:3005 | 📈 Dashboard & Monitoring |
| **InfluxDB** | http://localhost:8086 | 💾 Time-Series Database |

📖 [Hướng dẫn deploy đầy đủ](DEPLOY.md)

## Quick Links

- [Hardware Datasheets](docs/hardware/)
- [System Architecture & Planning](docs/planning/)
- [Setup Guides](docs/setup/)
- [Deployment Guide](DEPLOY.md)
- [Simulator](simulator/)

## Project Status

- [x] Hardware documentation collected & translated
- [x] Sensor datasheet integrated (Soil Multi-Parameter: Temp/Moisture/EC/NPK/pH)
- [x] Frequency plan confirmed (AS923 for Vietnam)
- [x] **Simulator** — Mô phỏng dữ liệu cảm biến (8 thông số đất)
- [x] **Data Pipeline** — MQTT → ChirpStack → Node-RED → InfluxDB → Grafana
- [x] **Smart Control** — Điều khiển bơm/van theo khu vực (3 zones)
- [x] **Auto Irrigation** — Tưới tự động theo ngưỡng độ ẩm + dừng khi mưa
- [x] **Crop Advisory** — Tư vấn theo giai đoạn cà phê Robusta/Arabica (6 giai đoạn)
- [x] **Weather Integration** — Thời tiết DakLak + dự báo 3 ngày
- [ ] Gateway firmware & ChirpStack setup
- [ ] Node configuration (reconfigure DTU from 868MHz to AS923)
- [ ] Sensor ↔ Node RS485 wiring & Modbus test
- [ ] Real weather API integration (Open-Meteo)

## Repository Structure

```
smarfarm-daklak/
├── README.md
├── docs/
│   ├── hardware/                          # Hardware datasheets
│   ├── planning/                          # System architecture & planning
│   ├── setup/                             # Setup guides
│   └── code/                              # Example code
├── server/
│   ├── docker-compose.yml                 # Full stack (ChirpStack + Node-RED + InfluxDB + Grafana + Smart Control)
│   └── config/                            # Server configurations
├── simulator/
│   ├── server.js                          # Soil sensor simulator (MQTT publisher)
│   └── public/index.html                  # Simulator web UI
└── smart-control/                         # 🆕 Smart Control & Advisory
    ├── server.js                          # Control logic, crop KB, weather, auto irrigation
    ├── public/index.html                  # Dashboard: điều khiển + tư vấn + quản lý quy tắc
    └── Dockerfile                         # Container image
```
