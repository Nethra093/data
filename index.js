const admin = require('firebase-admin');
const WebSocket = require('ws');

// Load Firebase service account credentials
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://real-time-database-4f52e-default-rtdb.asia-southeast1.firebasedatabase.app/"
});

// Get database reference to "Sensors" node
const db = admin.database();
const sensorsRef = db.ref('Sensors');

// Threshold values per sensor
const THRESHOLDS = {
  Sensor1: 500,
  Sensor2: 300,
  Sensor3: 400,
  Sensor4: 200,
  Sensor5: 350
};

// Create a WebSocket server on port 8080
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', ws => {
  console.log('New WebSocket client connected');
});

// Function to handle and broadcast sensor data
function processSensorData(data) {
  const sensors = data.val();
  console.log('📡 Received sensor data:', sensors);

  Object.entries(sensors).forEach(([sensor, value]) => {
    const threshold = THRESHOLDS[sensor] ?? null;
    const isAlert = threshold !== null && value > threshold;

    const sensorPacket = {
      type: 'sensor_data',
      sensor: sensor,
      value: value,
      alert: isAlert,
      threshold: threshold,
      ...(isAlert && {
        message: ALERT: ${sensor} exceeded threshold (${threshold}) with value ${value}`
      })
    };

    // Send to all connected WebSocket clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(sensorPacket));
      }
    });
  });
}

// Listen to Firebase for real-time updates
sensorsRef.on('value', snapshot => {
  if (snapshot.exists()) {
    processSensorData(snapshot);
  } else {
    console.log('No sensor data available.');
  }
}, errorObject => {
  console.log('Firebase read failed: ' + errorObject.name);
});
