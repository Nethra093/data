const admin = require('firebase-admin');
const WebSocket = require('ws');

// Firebase Admin Initialization
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://real-time-database-4f52e-default-rtdb.asia-southeast1.firebasedatabase.app/"
});

const db = admin.database();
const sensorsRef = db.ref('Sensors');

// Thresholds for sensor alerts
const THRESHOLDS = {
  Sensor1: 500,
  Sensor2: 300,
  Sensor3: 400,
  Sensor4: 200,
  Sensor5: 350
};

// Start WebSocket server
const wss = new WebSocket.Server({ port: 8080 });
wss.on('connection', ws => {
  console.log(' New WebSocket client connected');
});

// Function to process and broadcast sensor data + battery
function processSensorData(data) {
  const sensors = data.val();
  console.log(' Received sensor data:', sensors);

  // Handle battery status
  if (sensors.Battery !== undefined) {
    const batteryPacket = {
      type: 'battery_status',
      value: sensors.Battery,
      unit: '%',
    };

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(batteryPacket));
      }
    });
  }

  // Handle sensor alerts
  Object.entries(sensors).forEach(([sensor, value]) => {
    if (sensor === "Battery") return; // Skip Battery

    const threshold = THRESHOLDS[sensor] ?? null;
    const isAlert = threshold !== null && value > threshold;

    const sensorPacket = {
      type: 'sensor_data',
      sensor: sensor,
      value: value,
      alert: isAlert,
      threshold: threshold,
      ...(isAlert && {
        message: `ALERT: ${sensor} exceeded threshold (${threshold}) with value ${value}`
      })
    };

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(sensorPacket));
      }
    });
  });
}

// Real-time Firebase listener
sensorsRef.on('value', snapshot => {
  if (snapshot.exists()) {
    processSensorData(snapshot);
  } else {
    console.log(' No sensor data available.');
  }
}, errorObject => {
  console.log(' Firebase read failed: ' + errorObject.name);
});

