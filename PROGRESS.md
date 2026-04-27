# SmartFarm DakLak - Project Progress

> Cập nhật lần cuối: 2026-04-27 23:00 GMT+8

## Tổng quan dự án

Hệ thống nông nghiệp thông minh (precision agriculture) cho DakLak, Việt Nam.
Dựa trên LoRa/LoRaWAN để thu thập dữ liệu đất (nhiệt độ, độ ẩm, EC, NPK, pH) từ cảm biến ngoài vườn, đẩy lên server để giám sát và cảnh báo.

## Hardware hiện có

| Thiết bị | Model | Trạng thái | Ghi chú |
|----------|-------|------------|---------|
| Gateway | E870-L915LG12 | ✅ Đã có | LoRaWAN, SX1302, AS923 |
| Node (LoRaWAN) | **E78-DTU(900LN22)** | ✅ Đã có | LoRaWAN node, RS485, chip 6601 |
| Node (Raw LoRa) | E90-DTU(900SL22) | ✅ Đã có | ⚠️ Raw LoRa, không dùng với E870 |
| Sensor | Soil Multi-Parameter | ✅ Đã có | RS485 Modbus, 8 registers |

## Kiến trúc đã xác nhận

**E78-DTU + E870 = Tương thích LoRaWAN ✅**
- E78-DTU(900LN22): LoRaWAN node, RS485 tích hợp, chip 6601 Cortex-M4
- E870-L915LG12: LoRaWAN gateway, SX1302
- → Cặp đôi hoàn chỉnh, sẵn sàng triển khai
- Chi tiết: `docs/planning/two-options-comparison.md`

**E90-DTU(900SL22)**: Để备用 hoặc dự án khác (raw LoRa, không tương thích E870)

## Sensor Protocol

- Giao thức: RS485 Modbus RTU
- Địa chỉ mặc định: 0x02
- Baud: 9600-8N1
- Đọc 8 registers từ 0x0000: Temp, Moisture, EC, Salinity, N, P, K, pH
- Command: `02 03 00 00 00 08 [CRC16]`
- Chi tiết: `docs/hardware/soil-multi-parameter-sensor.md`

## Server Stack (Docker)

Đã có `docker-compose.yml` với 7 services:
- ChirpStack v4 (LoRaWAN network server) — :8080
- Node-RED (data processing) — :1880
- InfluxDB 2.7 (time-series DB) — :8086
- Grafana (dashboard) — :3000
- Mosquitto (MQTT) — :1883
- PostgreSQL + Redis (backend)

## File đã hoàn thành

```
smartfarm-daklak/
├── PROGRESS.md                          ← File này
├── README.md                            ← Project overview
├── docs/
│   ├── hardware/
│   │   ├── soil-multi-parameter-sensor.md  ✅ Sensor datasheet (EN)
│   │   ├── E870-L915LG12-gateway.md        ✅ Gateway datasheet (EN)
│   │   ├── E90-DTU-900SL22-node.md         ✅ Node datasheet (EN)
│   │   └── frequency-plan.md               ✅ AS923 frequency plan
│   ├── planning/
│   │   ├── system-architecture.md           ✅ System architecture
│   │   ├── connectivity-plan.md             ✅ Wiring & config
│   │   ├── server-selection.md              ✅ Server comparison
│   │   ├── deployment-guide.md              ✅ Step-by-step deploy guide
│   │   └── two-options-comparison.md        ✅ E78 vs E90 comparison
│   ├── software/
│   │   └── vendor-software-analysis.md      ✅ Vendor software analysis
│   ├── setup/
│   │   └── chirpstack-setup.md              ✅ ChirpStack install guide
│   └── code/
│       └── example_modbus.c                 ✅ Modbus RTU C code
├── server/
│   ├── docker-compose.yml                   ✅ Full server stack
│   ├── config/                              ✅ ChirpStack, Mosquitto, Grafana configs
│   └── README.md                            ✅ Server instructions
└── software/
    ├── 查看数据软件/                          ✅ ModScan32 + ModSim32 (diagnostic tools)
    └── stm32f103-mini-system/               ✅ STM32 firmware with Modbus reader
```

## Việc còn lại (TODO)

- [x] ~~Mua E78-DTU(900LN22)~~ → Đã có
- [ ] Test sensor với ModScan32 (commissioning)
- [ ] Cấu hình E78-DTU: AT command cho LoRaWAN join + Modbus polling
- [ ] Register gateway + device trong ChirpStack
- [ ] Viết payload decoder JavaScript trong ChirpStack
- [ ] Cấu hình Node-RED flow: MQTT → Decode → InfluxDB
- [ ] Tạo Grafana dashboard với panels cho từng thông số
- [ ] Deploy server (docker compose up -d trên laptop)
- [ ] Lắp sensor + node ngoài vườn (solar power)
- [ ] Kiểm tra end-to-end data flow
- [ ] Cài alert rules (moisture < 20%, pH bất thường)

## Session Context (cho AI)

- Repo clone tại: `/root/.openclaw/workspace/smartfarm-daklak`
- GitHub: `https://github.com/dinhhieudl/smartfarm-daklak`
- Toàn bộ tài liệu đã được dịch sang tiếng Anh
- Firmware STM32 (RT-Thread) đọc sensor qua RS485 UART2, addr 0x02, poll 5s
- ModScan32 là tool shareware để test sensor (3.5 min limit)
- **Hardware đã có: E870 gateway + E78-DTU(900LN22) node + Soil sensor**
- E78-DTU: LoRaWAN, RS485, chip 6601, AT command config, Modbus tự polling
- E90-DTU(900SL22) cũng có nhưng KHÔNG dùng với E870 (raw LoRa, không LoRaWAN)
- E870 dùng Semtech SX1302, chỉ nhận LoRaWAN frames
- Server: Docker Compose với 7 services (ChirpStack, Node-RED, InfluxDB, Grafana, Mosquitto, PostgreSQL, Redis)
