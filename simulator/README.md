# SmartFarm DakLak - Soil Sensor Simulator

Web-based simulator để test toàn bộ data pipeline mà không cần hardware.

## Kiến trúc

```
┌──────────────────────┐     MQTT (port 1883)     ┌───────────────┐
│   Web Simulator      │ ───────────────────────▶ │   Mosquitto   │
│   (localhost:3001)   │                          │   MQTT Broker │
│                      │                          └───────┬───────┘
│  - Gauges (8 params) │                                  │
│  - Sliders           │                          ┌───────▼───────┐
│  - Preset scenarios  │                          │   Node-RED    │
│  - Auto simulation   │                          │   (decode)    │
│  - Time series chart │                          └───────┬───────┘
│  - Event log         │                                  │
└──────────────────────┘                          ┌───────▼───────┐
                                                  │   InfluxDB    │
                                                  │   (storage)   │
                                                  └───────┬───────┘
                                                          │
                                                  ┌───────▼───────┐
                                                  │   Grafana     │
                                                  │   (dashboard) │
                                                  └───────────────┘
```

## Quick Start

```bash
# 1. Start server stack (nếu chưa chạy)
cd ../server && docker compose up -d

# 2. Start simulator
cd simulator
npm install
npm start

# 3. Open browser
open http://localhost:3001
```

## Tính năng

### 🎛️ Manual Control
- 8 sliders điều chỉnh từng thông số đất
- Gửi 1 lần hoặc auto mode

### 📋 Scenario Presets (6 kịch bản)
| Preset | Mô tả |
|--------|--------|
| ☕ Normal | Đất cà phê DakLak bình thường (bazan đỏ) |
| ☀️ Drought | Mùa khô - hạn hán, đất khô nứt |
| 🌧️ Flooding | Mùa mưa - ngập úng |
| 🍂 Nutrient Deficient | Thiếu dinh dưỡng, đất bạc màu |
| 🧂 Saline | Đất nhiễm mặn |
| ⚗️ Acidic | Đất chua (pH thấp) |

### ⚙️ Auto Simulation
- Tự động thêm variance (nhiễu) vào dữ liệu
- Điều chỉnh interval (1-300 giây)
- Event detection: tự động cảnh báo khi thông số bất thường

### 📊 Dashboard
- 8 gauge SVG cho từng thông số
- Time series chart (60 readings gần nhất)
- Soil Health Score (0-100)
- Event log

## MQTT Format

Publish đúng format ChirpStack v4 MQTT:
```
Topic: application/smartfarm-daklak/device/aabbccdd11223344/event/up
```

Node-RED flow hiện tại (`server/config/node-red-flows.json`) subscribe `application/#` → decode → InfluxDB.

## REST API

```bash
# Check status
curl http://localhost:3001/api/status

# Publish once with custom values
curl -X POST http://localhost:3001/api/publish \
  -H "Content-Type: application/json" \
  -d '{"temperature":35,"moisture":20,"ph":5.5}'
```

## Environment Variables

| Variable | Default | Mô tả |
|----------|---------|-------|
| `PORT` | 3001 | Web UI port |
| `MQTT_URL` | mqtt://localhost:1883 | MQTT broker URL |
