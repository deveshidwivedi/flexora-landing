# Flexora 🧤🎮

**Flexora** is a smart rehabilitation system designed to make hand physiotherapy engaging and effective. By combining a sensor-integrated glove with gamified therapy, it transforms repetitive exercises into an interactive experience, specifically targeting rehabilitation for children with Cerebral Palsy.

This project won the **National 1st Prize** at the 'Hack for Social Cause' Challenge 2026 and was presented to the **Hon'ble Prime Minister, Shri Narendra Modi**.

## 🚀 Features

- **PotionBlast Game:** A high-engagement therapy game built with **Phaser.js** where patients control gameplay through hand movements.
- **Hardware-Software Bridge:** A real-time data pipeline using **Node.js** and **WebSockets** to stream sensor data (Flex, Touch, and Accelerometer) from the glove to the browser.
- **Real-time Feedback:** Provides instant visual feedback to encourage correct therapeutic movements.

## 🛠️ Tech Stack

- **Frontend:** React.js, Phaser.js
- **Backend/Bridge:** Node.js, WebSockets, SerialPort API
- **Hardware Integration:** ESP32 (via Serial)

## ⚡ Getting Started

Follow these steps to get the system up and running on your local machine.

### 1. Clone the Repository
```bash
git clone [https://github.com/](https://github.com/)[your-username]/flexora-landing.git
cd flexora-landing
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the hardware bridge
```bash
cd bridge
node bridge.js
```
Note: Ensure the serialPort in bridge.js matches your device's COM/USB port (e.g., COM3 or /dev/ttyUSB0).

### 4. Launch the game
Open a new terminal in the root directory and start the React application:
```bash
npm start
```
The game will be available at http://localhost:3000.

### 🕹️ Controls (Bio-Feedback)
- **Aiming:** Move your hand (Accelerometer data) to tilt the shooter.
- **Shooting:** Flex your finger (Flex sensor threshold) to blast potions.
- **Color Swap:** Use specific touch points on the glove to switch potion colors.

---

### 👥 The Team
**Developed by:** Riya Jain, Palak Garg, Jui Kathare, Deveshi Dwivedi, Shobhini Kulshreshtha, and Sayani Himadeepthi, under the guidance of **Dr. Satish K. Tiwari**.

---
*Developed with ❤️ for Social Impact.*

