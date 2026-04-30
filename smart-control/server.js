// SmartFarm DakLak - Smart Control & Advisory Service
// Features: Multi-zone irrigation, pump/valve control, crop advisory, weather integration

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mqtt = require('mqtt');
const path = require('path');
const cron = require('node-cron');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ─── Config ───────────────────────────────────────────
const MQTT_URL = process.env.MQTT_URL || 'mqtt://localhost:1883';
const APP_ID = 'smartfarm-daklak';
const SIMULATOR_URL = process.env.SIMULATOR_URL || 'http://localhost:3001';

// ─── Zone Definitions (DakLak Coffee Farm) ────────────
const ZONES = [
  {
    id: 'zone-A',
    name: 'Khu A — Cà phê Robusta',
    area: 5000,       // m²
    crop: 'robusta',
    plantDate: '2024-04-15',
    soilType: 'bazan-red',
    pumpId: 'pump-1',
    valveId: 'valve-1',
    moistureSensor: 'aabbccdd11223344',
    location: { lat: 12.75, lng: 108.35 }
  },
  {
    id: 'zone-B',
    name: 'Khu B — Cà phê Robusta',
    area: 3500,
    crop: 'robusta',
    plantDate: '2023-06-01',
    soilType: 'bazan-red',
    pumpId: 'pump-1',
    valveId: 'valve-2',
    moistureSensor: 'aabbccdd11223345',
    location: { lat: 12.76, lng: 108.36 }
  },
  {
    id: 'zone-C',
    name: 'Khu C — Cà phê Arabica',
    area: 2000,
    crop: 'arabica',
    plantDate: '2025-01-10',
    soilType: 'bazan-yellow',
    pumpId: 'pump-2',
    valveId: 'valve-3',
    moistureSensor: 'aabbccdd11223346',
    location: { lat: 12.74, lng: 108.34 }
  }
];

// ─── Actuator State ───────────────────────────────────
let actuators = {
  'pump-1': { id: 'pump-1', name: 'Bơm chính #1', type: 'pump', state: 'off', autoMode: false, lastChange: null, flowRate: 50 },
  'pump-2': { id: 'pump-2', name: 'Bơm chính #2', type: 'pump', state: 'off', autoMode: false, lastChange: null, flowRate: 30 },
  'valve-1': { id: 'valve-1', name: 'Van khu A', type: 'valve', state: 'closed', autoMode: false, lastChange: null, zone: 'zone-A' },
  'valve-2': { id: 'valve-2', name: 'Van khu B', type: 'valve', state: 'closed', autoMode: false, lastChange: null, zone: 'zone-B' },
  'valve-3': { id: 'valve-3', name: 'Van khu C', type: 'valve', state: 'closed', autoMode: false, lastChange: null, zone: 'zone-C' }
};

// ─── Sensor Data Cache (per zone) ─────────────────────
let zoneSensorData = {};
ZONES.forEach(z => {
  zoneSensorData[z.id] = {
    temperature: 27.5, moisture: 55, ec: 450, salinity: 220,
    nitrogen: 120, phosphorus: 35, potassium: 180, ph: 5.8,
    lastUpdate: null
  };
});

// ─── Weather Cache (DakLak) ───────────────────────────
let weatherData = {
  temperature: 30,
  humidity: 70,
  rainfall: 0,
  windSpeed: 8,
  cloudCover: 40,
  forecast: [],
  lastUpdate: null,
  source: 'simulated'
};

// ─── Irrigation Rules ─────────────────────────────────
let irrigationRules = {
  'zone-A': {
    enabled: true,
    moistureMin: 35,
    moistureMax: 65,
    maxDurationMin: 30,
    cooldownMin: 120,
    rainPause: true,
    rainThreshold: 5,   // mm — skip irrigation if rainfall > this
    lastIrrigation: null
  },
  'zone-B': {
    enabled: true,
    moistureMin: 35,
    moistureMax: 65,
    maxDurationMin: 25,
    cooldownMin: 120,
    rainPause: true,
    rainThreshold: 5,
    lastIrrigation: null
  },
  'zone-C': {
    enabled: true,
    moistureMin: 40,
    moistureMax: 70,
    maxDurationMin: 20,
    cooldownMin: 90,
    rainPause: true,
    rainThreshold: 5,
    lastIrrigation: null
  }
};

// ─── Control History ──────────────────────────────────
let controlHistory = [];
let advisoryHistory = [];

// ─── Crop Knowledge Base (DakLak Coffee) ──────────────
const CROP_STAGES = {
  robusta: {
    name: 'Cà phê Robusta',
    stages: [
      {
        id: 'dormant',
        name: 'Nghỉ (Rụng lá)',
        months: [11, 12, 1],
        durationDays: 90,
        description: 'Cây rụng lá, nghỉ sinh dưỡng sau vụ thu hoạch',
        irrigation: { target: 30, frequency: '2 tuần/lần', notes: 'Giữ ẩm nhẹ, không tưới nhiều' },
        fertilization: { N: 0, P: 0, K: 0, notes: 'Bón phân chuồng hoai mục + vôi bột' },
        risks: ['Sâu bệnh ẩn trong vỏ cây', 'Đất khô nứt nếu không tưới duy trì']
      },
      {
        id: 'flowering',
        name: 'Ra hoa',
        months: [2, 3],
        durationDays: 45,
        description: 'Cây ra hoa trắng, cần nước kích thích nở hoa đồng đều',
        irrigation: { target: 55, frequency: '1 lần/tuần', notes: 'Tưới đẫm kích thích ra hoa. Thiếu nước = hoa rụng, mất mùa.' },
        fertilization: { N: 40, P: 60, K: 40, notes: 'Bón phân lân (P) để kích thích ra hoa, bón NPK 16-16-8' },
        risks: ['Mưa trái mùa gây rụng hoa', 'Thiếu nước = hoa không nở', 'Sâu đục quả']
      },
      {
        id: 'fruit-set',
        name: 'Đậu quả',
        months: [3, 4, 5],
        durationDays: 60,
        description: 'Quả non bắt đầu phát triển, giai đoạn nhạy cảm nhất',
        irrigation: { target: 60, frequency: '1 lần/tuần', notes: 'Tưới đều đặn, đất khô = rụng quả non hàng loạt' },
        fertilization: { N: 60, P: 30, K: 60, notes: 'Bón NPK 20-10-10 + phân bón lá có chứa Bo, Zn' },
        risks: ['Rụng quả non nếu stress nước', 'Thiếu Kali = quả nhỏ', 'Bệnh gỉ sắt lá']
      },
      {
        id: 'fruit-growth',
        name: 'Phát triển quả',
        months: [5, 6, 7, 8],
        durationDays: 120,
        description: 'Quả lớn dần, tích lũy chất khô bên trong',
        irrigation: { target: 55, frequency: '1-2 lần/tuần', notes: 'Tưới duy trì, mùa mưa có thể giảm tưới' },
        fertilization: { N: 30, P: 20, K: 80, notes: 'Bón Kali (K) cao để quả to, chất lượng tốt. NPK 10-5-20.' },
        risks: ['Mưa nhiều → ngập úng', 'Bệnh thán thư', 'Sâu đục quả']
      },
      {
        id: 'ripening',
        name: 'Chín',
        months: [9, 10],
        durationDays: 60,
        description: 'Quả chuyển từ xanh → đỏ, tích lũy caffeine và đường',
        irrigation: { target: 40, frequency: 'Giảm tưới', notes: 'Giảm nước để quả chín đều, tăng chất lượng' },
        fertilization: { N: 0, P: 0, K: 40, notes: 'Bón Kali nhẹ để quả ngọt hơn. Ngưng phân đạm.' },
        risks: ['Mưa nhiều → quả thối', 'Chín không đều', 'Rụng quả trước thu hoạch']
      },
      {
        id: 'harvest',
        name: 'Thu hoạch',
        months: [10, 11],
        durationDays: 45,
        description: 'Thu hoạch quả chín đỏ, sơ chế',
        irrigation: { target: 35, frequency: 'Tưới nhẹ sau thu hoạch', notes: 'Tưới phục hồi sau thu hoạch' },
        fertilization: { N: 20, P: 20, K: 20, notes: 'Bón phân phục hồi sau thu hoạch' },
        risks: ['Thiếu nhân công thu hoạch', 'Quả rụng mất', 'Sơ chế không kịp → giảm chất lượng']
      }
    ]
  },
  arabica: {
    name: 'Cà phê Arabica',
    stages: [
      {
        id: 'dormant',
        name: 'Nghỉ',
        months: [11, 12, 1],
        durationDays: 90,
        description: 'Giai đoạn nghỉ sau thu hoạch',
        irrigation: { target: 30, frequency: '2 tuần/lần', notes: 'Giữ ẩm nhẹ' },
        fertilization: { N: 0, P: 0, K: 0, notes: 'Bón phân chuồng + vôi' },
        risks: ['Sâu bệnh', 'Đất khô']
      },
      {
        id: 'flowering',
        name: 'Ra hoa',
        months: [2, 3],
        durationDays: 40,
        description: 'Hoa trắng, thơm',
        irrigation: { target: 55, frequency: '1 lần/tuần', notes: 'Tưới đẫm' },
        fertilization: { N: 30, P: 50, K: 30, notes: 'Bón lân kích thích ra hoa' },
        risks: ['Mưa trái mùa', 'Thiếu nước']
      },
      {
        id: 'fruit-set',
        name: 'Đậu quả',
        months: [3, 4],
        durationDays: 50,
        description: 'Quả non phát triển',
        irrigation: { target: 60, frequency: '1 lần/tuần', notes: 'Tưới đều' },
        fertilization: { N: 50, P: 25, K: 50, notes: 'NPK 20-10-10' },
        risks: ['Rụng quả non', 'Bệnh gỉ sắt']
      },
      {
        id: 'fruit-growth',
        name: 'Phát triển quả',
        months: [4, 5, 6, 7, 8],
        durationDays: 150,
        description: 'Quả lớn, Arabica cần nhiều nước hơn Robusta',
        irrigation: { target: 60, frequency: '2 lần/tuần', notes: 'Arabica nhạy cảm thiếu nước hơn Robusta' },
        fertilization: { N: 30, P: 20, K: 70, notes: 'Kali cao cho quả to' },
        risks: ['Nhiệt độ cao → stress', 'Thiếu nước → quả nhỏ']
      },
      {
        id: 'ripening',
        name: 'Chín',
        months: [9, 10],
        durationDays: 60,
        description: 'Quả chín đỏ',
        irrigation: { target: 45, frequency: 'Giảm', notes: 'Giảm nước cho quả chín đều' },
        fertilization: { N: 0, P: 0, K: 30, notes: 'Kali nhẹ' },
        risks: ['Quả thối nếu mưa']
      },
      {
        id: 'harvest',
        name: 'Thu hoạch',
        months: [10, 11],
        durationDays: 45,
        description: 'Thu hái chọn lọc (Arabica chín không đều)',
        irrigation: { target: 35, frequency: 'Phục hồi', notes: 'Tưới phục hồi' },
        fertilization: { N: 20, P: 20, K: 20, notes: 'Phục hồi sau thu hoạch' },
        risks: ['Nhân công', 'Chín không đều']
      }
    ]
  }
};

// ─── Utility Functions ────────────────────────────────

function getCurrentStage(crop, date = new Date()) {
  const month = date.getMonth() + 1;
  const cropData = CROP_STAGES[crop];
  if (!cropData) return null;
  const stage = cropData.stages.find(s => s.months.includes(month));
  return stage || cropData.stages[0];
}

function getPlantAge(plantDate) {
  const planted = new Date(plantDate);
  const now = new Date();
  const months = (now.getFullYear() - planted.getFullYear()) * 12 + (now.getMonth() - planted.getMonth());
  return { months, years: Math.floor(months / 12) };
}

function generateAdvisory(zone) {
  const sensor = zoneSensorData[zone.id];
  const stage = getCurrentStage(zone.crop);
  const age = getPlantAge(zone.plantDate);
  const rule = irrigationRules[zone.id];
  const advices = [];
  let urgency = 'info'; // info, warning, critical

  if (!stage) {
    advices.push({ type: 'error', message: 'Không xác định được giai đoạn cây trồng' });
    return { advices, urgency, stage: null };
  }

  // ── Moisture Advisory ──
  if (sensor.moisture < rule.moistureMin) {
    urgency = 'critical';
    advices.push({
      type: 'irrigation',
      icon: '💧',
      message: `Độ ẩm đất thấp (${sensor.moisture.toFixed(1)}% < ${rule.moistureMin}%). Cần tưới NGAY cho ${zone.name}.`,
      action: `Tưới ${stage.irrigation.frequency} — ${stage.irrigation.notes}`
    });
  } else if (sensor.moisture > rule.moistureMax) {
    urgency = 'warning';
    advices.push({
      type: 'drainage',
      icon: '🌊',
      message: `Độ ẩm đất cao (${sensor.moisture.toFixed(1)}% > ${rule.moistureMax}%). Kiểm tra thoát nước.`,
      action: 'Mở van thoát nước, kiểm tra hệ thống cống'
    });
  } else {
    advices.push({
      type: 'irrigation',
      icon: '✅',
      message: `Độ ẩm đất ổn định (${sensor.moisture.toFixed(1)}%). ${stage.irrigation.notes}`,
      action: `Duy trì tưới ${stage.irrigation.frequency}`
    });
  }

  // ── Fertilization Advisory ──
  const fert = stage.fertilization;
  const fertIssues = [];
  if (fert.N > 0 && sensor.nitrogen < fert.N * 1.5) fertIssues.push(`N thấp (${sensor.nitrogen}/${fert.N * 2} mg/kg)`);
  if (fert.P > 0 && sensor.phosphorus < fert.P * 1.5) fertIssues.push(`P thấp (${sensor.phosphorus}/${fert.P * 2} mg/kg)`);
  if (fert.K > 0 && sensor.potassium < fert.K * 1.5) fertIssues.push(`K thấp (${sensor.potassium}/${fert.K * 2} mg/kg)`);

  if (fertIssues.length > 0) {
    if (urgency === 'info') urgency = 'warning';
    advices.push({
      type: 'fertilization',
      icon: '🌿',
      message: `Thiếu dinh dưỡng: ${fertIssues.join(', ')}`,
      action: `${fert.notes}`
    });
  } else if (fert.N > 0 || fert.P > 0 || fert.K > 0) {
    advices.push({
      type: 'fertilization',
      icon: '✅',
      message: `Dinh dưỡng đầy đủ cho giai đoạn ${stage.name}`,
      action: `${fert.notes}`
    });
  }

  // ── pH Advisory ──
  if (sensor.ph < 4.5) {
    urgency = 'warning';
    advices.push({
      type: 'soil',
      icon: '⚗️',
      message: `Đất chua (pH ${sensor.ph.toFixed(1)}). Cà phê cần pH 5.0-6.5.`,
      action: 'Bón vôi bột (dolomite) 2-3 tấn/ha. Kiểm tra lại sau 2 tuần.'
    });
  } else if (sensor.ph > 7.0) {
    urgency = 'warning';
    advices.push({
      type: 'soil',
      icon: '⚗️',
      message: `Đất kiềm (pH ${sensor.ph.toFixed(1)}). Cà phê cần pH 5.0-6.5.`,
      action: 'Bón lưu huỳnh (S) hoặc phân chua (ammonium sulfate).'
    });
  }

  // ── EC/Salinity Advisory ──
  if (sensor.ec > 2000) {
    urgency = 'critical';
    advices.push({
      type: 'salinity',
      icon: '🧂',
      message: `EC cao (${sensor.ec} µS/cm) — đất nhiễm mặn!`,
      action: 'Tưới xả mặn (leaching), kiểm tra nguồn nước tưới.'
    });
  }

  // ── Temperature Advisory ──
  if (sensor.temperature > 38) {
    if (urgency === 'info') urgency = 'warning';
    advices.push({
      type: 'temperature',
      icon: '🌡️',
      message: `Nhiệt độ đất cao (${sensor.temperature.toFixed(1)}°C). Cây có thể bị stress nhiệt.`,
      action: 'Tưới làm mát, phủ rơm rạ che phủ gốc.'
    });
  }

  // ── Weather-based Advisory ──
  if (weatherData.rainfall > 20) {
    advices.push({
      type: 'weather',
      icon: '🌧️',
      message: `Mưa lớn (${weatherData.rainfall}mm). Tạm dừng tưới.`,
      action: 'Kiểm tra thoát nước, gia cố bờ vùng.'
    });
  } else if (weatherData.temperature > 35 && weatherData.humidity < 40) {
    advices.push({
      type: 'weather',
      icon: '☀️',
      message: `Nắng nóng (${weatherData.temperature}°C, độ ẩm ${weatherData.humidity}%). Tăng tưới.`,
      action: 'Tưới sáng sớm hoặc chiều muộn, tránh tưới giữa trưa.'
    });
  }

  // ── Stage-specific risks ──
  if (stage.risks && stage.risks.length > 0) {
    advices.push({
      type: 'risk',
      icon: '⚠️',
      message: `Rủi ro giai đoạn ${stage.name}:`,
      details: stage.risks
    });
  }

  // ── Plant age advisory ──
  if (age.months < 12) {
    advices.push({
      type: 'info',
      icon: '🌱',
      message: `Cây còn non (${age.months} tháng). Chăm sóc đặc biệt: tưới ít nhưng đều, bón phân nhẹ.`
    });
  } else if (age.years >= 3 && stage.id === 'fruit-set') {
    advices.push({
      type: 'info',
      icon: '☕',
      message: `Cây ${age.years} năm tuổi — đang trong giai đoạn kiến thiết cơ bản → kinh doanh.`
    });
  }

  return { advices, urgency, stage };
}

// ─── Auto Irrigation Logic ────────────────────────────
function checkAutoIrrigation() {
  ZONES.forEach(zone => {
    const rule = irrigationRules[zone.id];
    if (!rule.enabled) return;

    const sensor = zoneSensorData[zone.id];
    const actuator = actuators[zone.valveId];
    const pump = actuators[zone.pumpId];

    if (!actuator || !pump) return;

    // Check cooldown
    if (rule.lastIrrigation) {
      const elapsed = (Date.now() - rule.lastIrrigation) / 60000;
      if (elapsed < rule.cooldownMin) return;
    }

    // Check rain pause
    if (rule.rainPause && weatherData.rainfall > rule.rainThreshold) {
      // Skip irrigation — rain is sufficient
      if (actuator.state === 'open') {
        controlActuator(zone.valveId, 'close', 'auto-rain-pause');
        controlActuator(zone.pumpId, 'off', 'auto-rain-pause');
      }
      return;
    }

    // Check moisture
    if (sensor.moisture < rule.moistureMin && actuator.state === 'closed') {
      // Start irrigation
      controlActuator(zone.pumpId, 'on', 'auto');
      controlActuator(zone.valveId, 'open', 'auto');
      rule.lastIrrigation = Date.now();

      const evt = {
        type: 'auto-irrigation',
        zone: zone.id,
        zoneName: zone.name,
        moisture: sensor.moisture,
        threshold: rule.moistureMin,
        time: new Date().toISOString()
      };
      controlHistory.unshift(evt);
      if (controlHistory.length > 200) controlHistory.pop();
      io.emit('control_event', evt);

      // Schedule stop
      setTimeout(() => {
        if (actuator.state === 'open') {
          controlActuator(zone.valveId, 'close', 'auto-timeout');
          controlActuator(zone.pumpId, 'off', 'auto-timeout');
          io.emit('control_event', {
            type: 'auto-irrigation-stop',
            zone: zone.id,
            reason: 'timeout',
            time: new Date().toISOString()
          });
        }
      }, rule.maxDurationMin * 60000);
    }

    // Stop if moisture reached max
    if (sensor.moisture >= rule.moistureMax && actuator.state === 'open') {
      controlActuator(zone.valveId, 'close', 'auto-target-reached');
      controlActuator(zone.pumpId, 'off', 'auto-target-reached');
      io.emit('control_event', {
        type: 'auto-irrigation-stop',
        zone: zone.id,
        reason: 'target-reached',
        time: new Date().toISOString()
      });
    }
  });
}

function controlActuator(actuatorId, action, source = 'manual') {
  const act = actuators[actuatorId];
  if (!act) return false;

  const prevState = act.state;

  if (act.type === 'pump') {
    act.state = (action === 'on') ? 'on' : 'off';
  } else if (act.type === 'valve') {
    act.state = (action === 'open') ? 'open' : 'closed';
  }

  act.lastChange = new Date().toISOString();

  // Publish MQTT command (downlink)
  const topic = `application/${APP_ID}/device/actuator/${actuatorId}/command`;
  const payload = {
    actuatorId,
    type: act.type,
    action: act.state,
    source,
    timestamp: act.lastChange
  };

  if (mqttClient && mqttConnected) {
    mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 });
  }

  io.emit('actuator_update', { id: actuatorId, ...act });
  addControlEvent(`${act.name}: ${prevState} → ${act.state} (${source})`);

  return true;
}

// ─── Control Events ───────────────────────────────────
function addControlEvent(message) {
  const evt = { level: 'info', message, time: new Date().toISOString() };
  io.emit('control_log', evt);
}

// ─── MQTT ─────────────────────────────────────────────
let mqttClient = null;
let mqttConnected = false;

function connectMQTT() {
  mqttClient = mqtt.connect(MQTT_URL, {
    clientId: 'smartfarm-control-' + Math.random().toString(16).slice(2, 8),
    clean: true,
    connectTimeout: 3000
  });

  mqttClient.on('connect', () => {
    mqttConnected = true;
    // Subscribe to sensor data from simulator
    mqttClient.subscribe(`application/${APP_ID}/device/+/event/up`);
    io.emit('mqtt_status', { connected: true });
    addControlEvent('MQTT connected');
  });

  mqttClient.on('message', (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      if (payload.object) {
        // Update sensor data for matching zone
        const devEUI = payload.devEUI;
        const zone = ZONES.find(z => z.moistureSensor === devEUI);
        if (zone) {
          zoneSensorData[zone.id] = {
            ...payload.object,
            lastUpdate: new Date().toISOString()
          };
          io.emit('zone_sensor', { zoneId: zone.id, data: zoneSensorData[zone.id] });
        }
        // Also update zone-A from simulator's default device
        if (devEUI === 'aabbccdd11223344') {
          zoneSensorData['zone-A'] = { ...payload.object, lastUpdate: new Date().toISOString() };
          io.emit('zone_sensor', { zoneId: 'zone-A', data: zoneSensorData['zone-A'] });
        }
      }
    } catch (e) { /* ignore parse errors */ }
  });

  mqttClient.on('error', () => { mqttConnected = false; });
  mqttClient.on('close', () => { mqttConnected = false; });
}

// ─── Weather Fetch (Simulated for DakLak) ─────────────
function updateWeather() {
  // In production, call Open-Meteo API: https://api.open-meteo.com/v1/forecast?latitude=12.75&longitude=108.35&...
  // For now, simulate realistic DakLak weather
  const month = new Date().getMonth() + 1;
  const isRainy = month >= 5 && month <= 10;

  weatherData = {
    temperature: isRainy ? 25 + Math.random() * 5 : 28 + Math.random() * 8,
    humidity: isRainy ? 75 + Math.random() * 20 : 50 + Math.random() * 20,
    rainfall: isRainy ? (Math.random() > 0.5 ? Math.random() * 30 : 0) : 0,
    windSpeed: 5 + Math.random() * 10,
    cloudCover: isRainy ? 60 + Math.random() * 30 : 20 + Math.random() * 30,
    forecast: [
      { day: 'Hôm nay', temp: 28, rain: isRainy ? 15 : 0, desc: isRainy ? 'Mưa rào' : 'Nắng' },
      { day: 'Ngày mai', temp: 29, rain: isRainy ? 8 : 0, desc: isRainy ? 'Mưa nhẹ' : 'Ít mây' },
      { day: 'Ngày kia', temp: 30, rain: isRainy ? 20 : 0, desc: isRainy ? 'Mưa vừa' : 'Nắng' }
    ],
    lastUpdate: new Date().toISOString(),
    source: 'simulated'
  };

  io.emit('weather_update', weatherData);
}

// ─── Scheduled Tasks ──────────────────────────────────
// Check auto irrigation every 60 seconds
cron.schedule('*/1 * * * *', () => {
  checkAutoIrrigation();
});

// Update weather every 30 minutes
cron.schedule('*/30 * * * *', () => {
  updateWeather();
});

// Generate advisory every 5 minutes
cron.schedule('*/5 * * * *', () => {
  ZONES.forEach(zone => {
    const advisory = generateAdvisory(zone);
    io.emit('advisory', { zoneId: zone.id, ...advisory });
  });
});

// ─── WebSocket ────────────────────────────────────────
io.on('connection', (socket) => {
  // Send initial state
  socket.emit('init', {
    zones: ZONES,
    actuators,
    zoneSensorData,
    irrigationRules,
    weather: weatherData,
    cropStages: CROP_STAGES,
    controlHistory: controlHistory.slice(0, 50),
    mqttConnected
  });

  // Generate initial advisories
  ZONES.forEach(zone => {
    const advisory = generateAdvisory(zone);
    socket.emit('advisory', { zoneId: zone.id, ...advisory });
  });

  // Control actuator
  socket.on('control', ({ actuatorId, action }) => {
    const success = controlActuator(actuatorId, action, 'manual');
    socket.emit('control_result', { actuatorId, action, success });
  });

  // Toggle auto mode for zone
  socket.on('set_auto_mode', ({ zoneId, enabled }) => {
    if (irrigationRules[zoneId]) {
      irrigationRules[zoneId].enabled = enabled;
      io.emit('rule_update', { zoneId, rule: irrigationRules[zoneId] });
      addControlEvent(`Auto irrigation ${zoneId}: ${enabled ? 'BẬT' : 'TẮT'}`);
    }
  });

  // Update irrigation rule
  socket.on('update_rule', ({ zoneId, rule }) => {
    if (irrigationRules[zoneId]) {
      Object.assign(irrigationRules[zoneId], rule);
      io.emit('rule_update', { zoneId, rule: irrigationRules[zoneId] });
      addControlEvent(`Cập nhật quy tắc tưới ${zoneId}`);
    }
  });

  // Request advisory
  socket.on('request_advisory', ({ zoneId }) => {
    const zone = ZONES.find(z => z.id === zoneId);
    if (zone) {
      const advisory = generateAdvisory(zone);
      socket.emit('advisory', { zoneId, ...advisory });
    }
  });

  // Refresh weather
  socket.on('refresh_weather', () => {
    updateWeather();
  });
});

// ─── REST API ─────────────────────────────────────────
app.get('/api/zones', (req, res) => {
  res.json(ZONES.map(z => ({
    ...z,
    sensor: zoneSensorData[z.id],
    rule: irrigationRules[z.id],
    stage: getCurrentStage(z.crop),
    plantAge: getPlantAge(z.plantDate)
  })));
});

app.get('/api/actuators', (req, res) => res.json(actuators));

app.post('/api/control', (req, res) => {
  const { actuatorId, action } = req.body;
  const success = controlActuator(actuatorId, action, 'api');
  res.json({ success, actuator: actuators[actuatorId] });
});

app.get('/api/advisory/:zoneId', (req, res) => {
  const zone = ZONES.find(z => z.id === req.params.zoneId);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });
  res.json({ zone: zone.id, ...generateAdvisory(zone) });
});

app.get('/api/weather', (req, res) => res.json(weatherData));

app.get('/api/crop-stages', (req, res) => res.json(CROP_STAGES));

app.get('/api/history', (req, res) => res.json(controlHistory.slice(0, 100)));

// ─── Start ────────────────────────────────────────────
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`\n🎛️  SmartFarm DakLak - Smart Control`);
  console.log(`   Dashboard:  http://localhost:${PORT}`);
  console.log(`   MQTT:       ${MQTT_URL}`);
  console.log(`   Zones:      ${ZONES.length}`);
  console.log(`   Actuators:  ${Object.keys(actuators).length}\n`);
  connectMQTT();
  updateWeather();
});
