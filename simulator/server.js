// SmartFarm DakLak - Soil Sensor Simulator Server
// Publishes MQTT in ChirpStack format → Node-RED → InfluxDB → Grafana

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mqtt = require('mqtt');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ─── Config ───────────────────────────────────────────
const MQTT_URL = process.env.MQTT_URL || 'mqtt://localhost:1883';
const APP_ID = 'smartfarm-daklak';
const DEV_EUI = 'aabbccdd11223344';

// ─── Sensor State ─────────────────────────────────────
let sensorData = {
  temperature: 27.5,
  moisture: 55.0,
  ec: 450,
  salinity: 220,
  nitrogen: 120,
  phosphorus: 35,
  potassium: 180,
  ph: 5.8
};

let config = {
  autoMode: false,
  intervalSec: 30,
  scenario: 'normal',
  variation: 2.0
};

let events = [];
let tickTimer = null;
let mqttClient = null;
let mqttConnected = false;
let totalSent = 0;

// ─── DakLak Coffee Soil Presets ───────────────────────
const PRESETS = {
  normal: {
    name: '☕ Đất cà phê DakLak - Bình thường',
    desc: 'Đất bazan đỏ, pH 5.5-6.5, giàu hữu cơ',
    values: { temperature: 27.5, moisture: 55, ec: 450, salinity: 220, nitrogen: 120, phosphorus: 35, potassium: 180, ph: 5.8 }
  },
  drought: {
    name: '☀️ Hạn hán - Thiếu nước',
    desc: 'Mùa khô DakLak (tháng 11-3), đất khô nứt',
    values: { temperature: 38, moisture: 12, ec: 2800, salinity: 1400, nitrogen: 80, phosphorus: 20, potassium: 90, ph: 6.8 }
  },
  flooding: {
    name: '🌧️ Ngập úng - Mưa nhiều',
    desc: 'Mùa mưa DakLak (tháng 5-10), đất ngập nước',
    values: { temperature: 24, moisture: 92, ec: 180, salinity: 80, nitrogen: 45, phosphorus: 15, potassium: 60, ph: 4.2 }
  },
  nutrient_deficient: {
    name: '🍂 Thiếu dinh dưỡng',
    desc: 'Đất bạc màu, NPK thấp, cần bón phân',
    values: { temperature: 28, moisture: 40, ec: 150, salinity: 70, nitrogen: 25, phosphorus: 8, potassium: 40, ph: 5.0 }
  },
  saline: {
    name: '🧂 Đất nhiễm mặn',
    desc: 'Khu vực gần biển hoặc tưới nước mặn',
    values: { temperature: 30, moisture: 45, ec: 4200, salinity: 2100, nitrogen: 60, phosphorus: 12, potassium: 50, ph: 8.2 }
  },
  acidic: {
    name: '⚗️ Đất chua (pH thấp)',
    desc: 'Đất bazan chua tự nhiên, cần bón vôi',
    values: { temperature: 26, moisture: 60, ec: 380, salinity: 190, nitrogen: 90, phosphorus: 28, potassium: 140, ph: 3.8 }
  }
};

// ─── MQTT Connection ──────────────────────────────────
function connectMQTT() {
  mqttClient = mqtt.connect(MQTT_URL, {
    clientId: 'smartfarm-simulator',
    clean: true,
    connectTimeout: 3000
  });

  mqttClient.on('connect', () => {
    mqttConnected = true;
    io.emit('mqtt_status', { connected: true });
    addEvent('info', 'MQTT connected to ' + MQTT_URL);
  });

  mqttClient.on('error', (err) => {
    mqttConnected = false;
    io.emit('mqtt_status', { connected: false, error: err.message });
  });

  mqttClient.on('close', () => {
    mqttConnected = false;
    io.emit('mqtt_status', { connected: false });
  });
}

// ─── Publish to ChirpStack MQTT Format ────────────────
function publishSensorData() {
  const topic = `application/${APP_ID}/device/${DEV_EUI}/event/up`;

  // ChirpStack v4 MQTT format
  const payload = {
    applicationId: APP_ID,
    applicationName: 'SmartFarm',
    deviceName: 'soil-sensor-01',
    devEUI: DEV_EUI,
    fCnt: totalSent,
    fPort: 2,
    data: '', // base64 (we also send decoded object)
    object: {
      temperature: Math.round(sensorData.temperature * 10) / 10,
      moisture: Math.round(sensorData.moisture * 10) / 10,
      ec: Math.round(sensorData.ec),
      salinity: Math.round(sensorData.salinity),
      nitrogen: Math.round(sensorData.nitrogen),
      phosphorus: Math.round(sensorData.phosphorus),
      potassium: Math.round(sensorData.potassium),
      ph: Math.round(sensorData.ph * 10) / 10
    },
    rxInfo: [{
      gatewayID: 'e870-gateway-01',
      rssi: -65 - Math.floor(Math.random() * 20),
      loRaSNR: 7.5 + Math.random() * 3
    }],
    txInfo: {
      frequency: 923200000,
      dr: 2
    },
    time: new Date().toISOString()
  };

  if (mqttClient && mqttConnected) {
    mqttClient.publish(topic, JSON.stringify(payload), { qos: 0 });
    totalSent++;
  }

  // Broadcast to all web clients
  io.emit('sensor_update', {
    data: { ...sensorData },
    timestamp: new Date().toISOString(),
    sent: totalSent,
    mqttConnected
  });
}

// ─── Auto Variation (Realistic Noise) ─────────────────
function applyVariation() {
  const v = config.variation / 100;
  sensorData.temperature += (Math.random() - 0.5) * 2 * v * 5;
  sensorData.moisture += (Math.random() - 0.5) * 2 * v * 3;
  sensorData.ec += (Math.random() - 0.5) * 2 * v * 50;
  sensorData.salinity += (Math.random() - 0.5) * 2 * v * 20;
  sensorData.nitrogen += (Math.random() - 0.5) * 2 * v * 10;
  sensorData.phosphorus += (Math.random() - 0.5) * 2 * v * 5;
  sensorData.potassium += (Math.random() - 0.5) * 2 * v * 15;
  sensorData.ph += (Math.random() - 0.5) * 2 * v * 0.3;

  // Clamp ranges
  sensorData.temperature = Math.max(-10, Math.min(60, sensorData.temperature));
  sensorData.moisture = Math.max(0, Math.min(100, sensorData.moisture));
  sensorData.ec = Math.max(0, Math.min(10000, sensorData.ec));
  sensorData.salinity = Math.max(0, Math.min(5000, sensorData.salinity));
  sensorData.nitrogen = Math.max(0, Math.min(500, sensorData.nitrogen));
  sensorData.phosphorus = Math.max(0, Math.min(200, sensorData.phosphorus));
  sensorData.potassium = Math.max(0, Math.min(500, sensorData.potassium));
  sensorData.ph = Math.max(0, Math.min(14, sensorData.ph));
}

// ─── Event Detection ──────────────────────────────────
function checkEvents() {
  const d = sensorData;
  if (d.moisture < 20) addEvent('critical', `💧 Độ ẩm đất thấp: ${d.moisture.toFixed(1)}% — Cần tưới ngay!`);
  if (d.moisture > 85) addEvent('warning', `💧 Độ ẩm đất cao: ${d.moisture.toFixed(1)}% — Nguy cơ ngập úng`);
  if (d.temperature > 40) addEvent('warning', `🌡️ Nhiệt độ đất cao: ${d.temperature.toFixed(1)}°C — Stress nhiệt`);
  if (d.temperature < 10) addEvent('warning', `🌡️ Nhiệt độ đất thấp: ${d.temperature.toFixed(1)}°C — Nguy cơ rét hại`);
  if (d.ph < 4.5) addEvent('warning', `🧪 pH đất chua: ${d.ph.toFixed(1)} — Cần bón vôi`);
  if (d.ph > 8.0) addEvent('warning', `🧪 pH đất kiềm: ${d.ph.toFixed(1)} — Cần bón lưu huỳnh`);
  if (d.ec > 3000) addEvent('critical', `⚡ EC cao: ${d.ec} µS/cm — Đất nhiễm mặn!`);
  if (d.nitrogen < 50) addEvent('info', `🌿 Nitrogen thấp: ${d.nitrogen} mg/kg — Bón phân N`);
  if (d.potassium < 80) addEvent('info', `🌿 Kali thấp: ${d.potassium} mg/kg — Bón phân K`);
}

function addEvent(level, message) {
  const evt = { level, message, time: new Date().toISOString() };
  events.unshift(evt);
  if (events.length > 100) events.pop();
  io.emit('event', evt);
}

// ─── Simulation Tick ──────────────────────────────────
function startAutoMode() {
  stopAutoMode();
  tickTimer = setInterval(() => {
    applyVariation();
    checkEvents();
    publishSensorData();
  }, config.intervalSec * 1000);
  // Publish immediately
  applyVariation();
  checkEvents();
  publishSensorData();
  addEvent('info', `▶ Auto mode started: mỗi ${config.intervalSec}s`);
}

function stopAutoMode() {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
    addEvent('info', '⏸ Auto mode stopped');
  }
}

// ─── WebSocket (Socket.IO) ────────────────────────────
io.on('connection', (socket) => {
  // Send current state to new client
  socket.emit('init', {
    data: { ...sensorData },
    config: { ...config },
    events: events.slice(0, 50),
    presets: Object.entries(PRESETS).map(([k, v]) => ({ key: k, ...v })),
    mqttConnected,
    totalSent
  });

  // Slider change
  socket.on('update_param', ({ param, value }) => {
    if (sensorData.hasOwnProperty(param)) {
      sensorData[param] = parseFloat(value);
      io.emit('sensor_update', {
        data: { ...sensorData },
        timestamp: new Date().toISOString(),
        sent: totalSent,
        mqttConnected
      });
    }
  });

  // Preset selection
  socket.on('apply_preset', (presetKey) => {
    const preset = PRESETS[presetKey];
    if (preset) {
      Object.assign(sensorData, { ...preset.values });
      config.scenario = presetKey;
      io.emit('sensor_update', {
        data: { ...sensorData },
        timestamp: new Date().toISOString(),
        sent: totalSent,
        mqttConnected
      });
      io.emit('config_update', config);
      addEvent('info', `📋 Applied preset: ${preset.name}`);
    }
  });

  // Auto mode toggle
  socket.on('set_auto', (enabled) => {
    config.autoMode = enabled;
    if (enabled) startAutoMode();
    else stopAutoMode();
    io.emit('config_update', config);
  });

  // Interval change
  socket.on('set_interval', (sec) => {
    config.intervalSec = Math.max(1, Math.min(300, parseInt(sec)));
    if (config.autoMode) startAutoMode();
    io.emit('config_update', config);
  });

  // Variation change
  socket.on('set_variation', (v) => {
    config.variation = Math.max(0, Math.min(20, parseFloat(v)));
    io.emit('config_update', config);
  });

  // Manual send
  socket.on('send_once', () => {
    applyVariation();
    checkEvents();
    publishSensorData();
  });
});

// ─── REST API ─────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    mqttConnected,
    totalSent,
    config,
    data: sensorData,
    uptime: process.uptime()
  });
});

app.post('/api/publish', (req, res) => {
  const body = req.body || {};
  Object.keys(body).forEach(k => {
    if (sensorData.hasOwnProperty(k)) sensorData[k] = parseFloat(body[k]);
  });
  applyVariation();
  checkEvents();
  publishSensorData();
  res.json({ ok: true, sent: totalSent, data: sensorData });
});

// ─── Start ────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🌱 SmartFarm DakLak Simulator`);
  console.log(`   Web UI:  http://localhost:${PORT}`);
  console.log(`   MQTT:    ${MQTT_URL}`);
  console.log(`   Device:  ${DEV_EUI}\n`);
  connectMQTT();
});
