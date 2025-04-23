const admin = require('firebase-admin');
const WebSocket = require('ws');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://real-time-database-4f52e-default-rtdb.asia-southeast1.firebasedatabase.app/"
});

const db = admin.database();
const sensorsRef = db.ref('Sensors');

// Threshold values
const THRESHOLDS = {
  Sensor1: 500,
  Sensor2: 300,
  Sensor3: 400,
  Sensor4: 200,
  Sensor5: 350
};

// WebSocket Server setup
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', ws => {
  console.log('New client connected!');
});

// Function to check thresholds and send alerts
function processSensorData(data) {
  const sensors = data.val();
  console.log('Received sensor data:', sensors);

  Object.keys(THRESHOLDS).forEach(sensor => {
    if (sensors[sensor] !== undefined) {
      if (sensors[sensor] > THRESHOLDS[sensor]) {
        const alertMessage = `⚠️ ALERT: ${sensor} exceeded threshold! Value: ${sensors[sensor]}`;
        console.log(alertMessage);

        // Send alert to all connected WebSocket clients
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(alertMessage);
          }
        });
      }
    }
  });
}

// Listen for real-time changes to sensor data
sensorsRef.on('value', snapshot => {
  if (snapshot.exists()) {
    processSensorData(snapshot);
  } else {
    console.log('No sensor data available.');
  }
}, errorObject => {
  console.log('Firebase read failed: ' + errorObject.name);
});
