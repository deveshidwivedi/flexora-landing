const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const WebSocket = require("ws");

// Configuration - CHANGE PORT NAME AS NEEDED
const config = {
  serialPort: "USB3.10", // Windows: 'COM3', Linux/macOS: '/dev/ttyUSB0'
  baudRate: 115200,
  websocketPort: 8080,
};

// Initialize Serial Port
const port = new SerialPort({
  path: config.serialPort,
  baudRate: config.baudRate,
  autoOpen: false, // We'll handle opening manually
});

// Create parser that looks for complete lines
const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

// WebSocket Server
const wss = new WebSocket.Server({ port: config.websocketPort });

// Track connected clients
const clients = new Set();

// ---- Serial Port Events ----
port.on("open", () => {
  console.log(`Serial port opened on ${config.serialPort}`);
});

port.on("error", (err) => {
  console.error("Serial port error:", err.message);
});

port.on("close", () => {
  console.log("Serial port closed");
});

// ---- WebSocket Events ----
wss.on("connection", (ws) => {
  clients.add(ws);
  console.log(`New WebSocket client (${clients.size} total)`);

  ws.on("close", () => {
    clients.delete(ws);
    console.log(`Client disconnected (${clients.size} remaining)`);
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err.message);
  });
});

// ---- Data Processing ----
parser.on("data", (rawLine) => {
  const line = rawLine.trim();

  // Skip debug messages
  if (line.startsWith("[DEBUG]")) {
    console.log("Arduino:", line);
    return;
  }

  // Validate data packet
  const values = line.split(",");
  if (values.length !== 13) {
    console.warn("Invalid data format:", line);
    return;
  }

  // Convert to numbers and validate
  const numericValues = values.map(Number);
  if (numericValues.some(isNaN)) {
    console.warn("Non-numeric data:", line);
    return;
  }

  // Structure the data
  const sensorData = {
    flex: numericValues.slice(0, 4),
    touch: numericValues.slice(4, 10),
    accel: numericValues.slice(10, 13),
    timestamp: Date.now(),
  };

  // Broadcast to all clients
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(sensorData));
    }
  });

  // Optional: Log parsed data
  console.log("Parsed:", {
    flex: sensorData.flex,
    touch: sensorData.touch.slice(0, 2), // Just show first 2 touch values
    accel: sensorData.accel,
  });
});

// ---- Start Everything ----
port.open((err) => {
  if (err) {
    return console.error("Failed to open port:", err.message);
  }
  console.log(`Bridge running on ws://localhost:${config.websocketPort}`);
});

// Cleanup on exit
process.on("SIGINT", () => {
  console.log("\nClosing bridge...");
  port.close();
  wss.close();
  process.exit();
});
