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

# 2. Server stack
cd server && docker compose up -d && cd ..

# 3. Simulator
cd simulator && npm install && npm start
# → Mở http://localhost:3001
```

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
- [ ] Gateway firmware & ChirpStack setup
- [ ] Node configuration (reconfigure DTU from 868MHz to AS923)
- [ ] Sensor ↔ Node RS485 wiring & Modbus test
- [ ] Dashboard / data pipeline

## Repository Structure

```
smarfarm-daklak/
├── README.md
├── docs/
│   ├── hardware/
│   │   ├── E870-L915LG12-gateway.md      # Gateway datasheet (EN)
│   │   ├── E90-DTU-900SL22-node.md       # LoRa DTU datasheet (EN)
│   │   ├── soil-multi-parameter-sensor.md # Soil sensor datasheet (EN)
│   │   ├── frequency-plan.md             # Frequency & region config
│   │   └── original/                     # Original Chinese docs + photos
│   ├── planning/
│   │   ├── system-architecture.md         # Overall architecture
│   │   ├── connectivity-plan.md           # Gateway ↔ Node ↔ Sensor wiring
│   │   └── server-selection.md            # ChirpStack vs alternatives
│   ├── setup/
│   │   └── chirpstack-setup.md            # Step-by-step ChirpStack install
│   └── code/
│       └── example_modbus.c               # Modbus RTU reader (C)
```
