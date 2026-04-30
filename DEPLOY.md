# Deployment Guide - SmartFarm DakLak (Local Server)

> Hướng dẫn deploy toàn bộ hệ thống trên local server
> Cập nhật: 2026-04-30

---

## Yêu cầu hệ thống

| Phần mềm | Version tối thiểu | Kiểm tra |
|----------|-------------------|----------|
| Docker | 20.10+ | `docker --version` |
| Docker Compose | v2.0+ | `docker compose version` |
| Node.js | 18+ | `node --version` |
| Git | 2.0+ | `git --version` |

---

## Bước 1: Clone repo

```bash
git clone https://github.com/dinhhieudl/smartfarm-daklak.git
cd smartfarm-daklak
```

## Bước 2: Deploy Server Stack

```bash
cd server

# Khởi động 7 services: ChirpStack, Node-RED, InfluxDB, Grafana, Mosquitto, PostgreSQL, Redis
docker compose up -d

# Kiểm tra tất cả containers đang chạy
docker compose ps
```

> **Lưu ý quan trọng:** PostgreSQL cần extension `pg_trgm` (đã cấu hình trong `config/postgres-init/01-extensions.sql`).
> Nếu ChirpStack không tạo được bảng, kiểm tra postgres logs: `docker logs sf-postgres`

**Truy cập các dịch vụ:**

| Service | URL | Login |
|---------|-----|-------|
| ChirpStack | http://localhost:8080 | admin / admin1234 (gRPC-web, login qua web UI) |
| Node-RED | http://localhost:1880 | — |
| Grafana | http://localhost:3000 | admin / admin |
| InfluxDB | http://localhost:8086 | admin / admin12345 |
| MQTT | localhost:1883 | — |

### 2.1 Cấu hình ChirpStack

1. Mở http://localhost:8080, đăng nhập admin/admin
2. **Đổi mật khẩu admin** ngay
3. Tạo **Device Profile**:
   - Name: `Soil-Sensor-v1`
   - Region: `AS923`
   - MAC version: `1.0.3`
   - Codec: `Custom JavaScript decoder`
   - Paste nội dung `server/config/chirpstack-payload-decoder.js`

4. Tạo **Application**: `SmartFarm`
5. Tạo **Device**:
   - DevEUI: `aabbccdd11223344` (mặc định của simulator)
   - Device Profile: `Soil-Sensor-v1`
   - App Key: random 16 bytes

### 2.2 Cấu hình Node-RED

1. Mở http://localhost:1880
2. Import flow: Menu → Import → chọn `server/config/node-red-flows.json`
3. Cấu hình InfluxDB connection trong flow:
   - Double-click node "SmartFarm InfluxDB"
   - URL: `http://influxdb:8086`
   - Token: `smarfarm-token-2026`
   - Org: `smarfarm`
4. Deploy flow

### 2.3 Cấu hình Grafana

1. Mở http://localhost:3000, đăng nhập admin/admin
2. **Add Data Source** → InfluxDB:
   - URL: `http://influxdb:8086`
   - Token: `smarfarm-token-2026`
   - Org: `smarfarm`
   - Default bucket: `soil_data`
3. **Import Dashboard**:
   - Menu → Dashboards → Import
   - Upload file: `server/config/grafana/dashboards/soil-monitoring.json`

## Bước 3: Deploy Simulator

```bash
cd simulator

# Cài dependencies
npm install

# Khởi động simulator
npm start
```

→ Mở http://localhost:3001

### Sử dụng Simulator

1. **Chọn preset**: Click 1 trong 6 kịch bản (Normal, Drought, Flooding...)
2. **Điều chỉnh thủ công**: Kéo slider cho từng thông số
3. **Auto mode**: Bật "Auto Mode" → simulator tự động gửi data mỗi X giây
4. **Send Once**: Gửi 1 lần để test
5. **Theo dõi**: Kiểm tra Grafana dashboard http://localhost:3000

### Kiểm tra pipeline

```bash
# 1. Simulator publish data
curl http://localhost:3001/api/status

# 2. MQTT nhận data
mosquitto_sub -h localhost -t "application/#" -v

# 3. InfluxDB có data
docker exec sf-influxdb influx query \
  'from(bucket:"soil_data") |> range(start:-1h) |> last()' \
  --org smarfarm --token smarfarm-token-2026

# 4. Grafana dashboard hiển thị
# Mở http://localhost:3000 → Dashboards → SmartFarm DakLak
```

## Bước 4: Deploy trên Server thật (không phải localhost)

Nếu server khác máy chạy Docker:

```bash
# Sửa MQTT_URL trong simulator
MQTT_URL=mqtt://<server-ip>:1883 npm start

# Hoặc sửa docker-compose.yml port binding:
# ports:
#   - "0.0.0.0:1883:1883"   ← Mosquitto
#   - "0.0.0.0:8080:8080"   ← ChirpStack
#   - "0.0.0.0:3000:3000"   ← Grafana
```

## Firewall

Mở các port cần thiết:

```bash
# Ubuntu/Debian
sudo ufw allow 1883/tcp   # MQTT
sudo ufw allow 8080/tcp   # ChirpStack
sudo ufw allow 1880/tcp   # Node-RED
sudo ufw allow 3000/tcp   # Grafana
sudo ufw allow 8086/tcp   # InfluxDB
sudo ufw allow 3001/tcp   # Simulator
sudo ufw allow 1700/udp   # LoRa packet forwarder (khi có gateway)
```

## Troubleshooting

| Vấn đề | Giải pháp |
|--------|-----------|
| `docker compose up` lỗi port | Đổi port trong `docker-compose.yml` hoặc dừng service đang dùng port |
| Simulator không connect MQTT | Kiểm tra Mosquitto: `docker compose logs mosquitto` |
| Node-RED không có data | Kiểm tra MQTT topic: `mosquitto_sub -h localhost -t "application/#" -v` |
| Grafana không có data | Kiểm tra InfluxDB token và bucket name |
| ChirpStack không nhận device | Kiểm tra DevEUI và Device Profile match |

---

## Thứ tự deploy khuyến nghị

```
1. docker compose up -d          ← Khởi động server stack
2. Chờ 30s cho tất cả services ready
3. Cấu hình ChirpStack (Device Profile, Application, Device)
4. Import Node-RED flow + cấu hình InfluxDB connection
5. Import Grafana dashboard
6. npm start (simulator)         ← Khởi động simulator
7. Mở http://localhost:3001 → chọn preset → Send Once
8. Kiểm tra Grafana dashboard có data chưa
```
