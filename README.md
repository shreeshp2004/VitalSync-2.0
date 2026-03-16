<div align="center">
  <img src="assets/logos.png" alt="VitalSync Partners - IIT Bombay, FOSSEE, EduPyramids, Spoken Tutorial" width="100%">
  
  <br>
  <h1>⚡ VitalSync 2.0</h1>
  <p><b>Real-Time Health Monitoring for Athletes & Performance Teams</b></p>
</div>

VitalSync is an IoT-powered wearable health monitoring system designed to track vital signs — including ECG rhythm, SpO₂, body temperature, and physical movement — in real time. It seamlessly connects custom ESP8266-based hardware with a premium, robust real-time web dashboard.

## 🚀 Key Features

*   **Real-Time Live Sensor Dashboard:** Direct streaming from ESP8266 via JSON endpoint (bypassing backend latency).
*   **ECG Waveform Analysis:** Live scrolling canvas rendering raw AD8232 ECG data with peak tracking and signal quality estimation.
*   **Fall Detection:** Continuous 3-axis accelerometer (ADXL345) monitoring with SVM thresholding for instant fall alerts.
*   **Comfort & Risk Zones:** Dynamic visual indicators for temperature (DHT11) and heart rate zones (Resting / Cardio / Max).
*   **Smart Chatbot Assistant:** Built-in floating AI assistant loaded with 30+ project-specific FAQs to help users navigate features and hardware setup.
*   **Premium UI/UX:** Dark-mode optimized, fully responsive interface across 6 distinct pages.

## 🛠️ Tech Stack

### Hardware Layer
*   **Microcontroller:** ESP8266 (NodeMCU)
*   **Sensors:** 
    *   AD8232 (ECG / Electrocardiogram)
    *   ADXL345 (3-Axis Accelerometer / Fall Detection)
    *   DHT11 (Temperature & Humidity)
*   **Display:** SSD1306 OLED (I2C)

### Software & Web Layer
*   **Frontend:** HTML5, CSS3 (Custom Design System), Vanilla JS, Canvas API
*   **Communication:** WebSockets (Engine.io/Socket.io), REST HTTP (CORS Enabled)
*   **Backend / ML:** Node.js (Express), Python (FastAPI, Scikit-learn), PostgreSQL

## 📡 Hardware Setup & Flashing

The core of VitalSync's real-time capability relies on the ESP8266 operating as an independent web server.

1.  Open `sketch_new/sketch_new.ino` in the Arduino IDE.
2.  Update the WiFi credentials:
    ```cpp
    const char* ssid     = "YOUR_WIFI_NAME";
    const char* password = "YOUR_WIFI_PASSWORD";
    ```
3.  Flash the code to your ESP8266.
4.  Open the Serial Monitor (115200 baud) to find the assigned IP address (e.g., `192.168.1.45`).

## 💻 Running the Web Dashboard

The web interface is composed of static files that use client-side logic to fetch data directly from the hardware.

1.  **Start a local server:** You can use VS Code's "Live Server" extension, or run `http-server` via Node.js in the project root:
    ```bash
    npx http-server . -p 5500
    ```
2.  **Navigate to the Live Sensor Page:** Open `http://localhost:5500/live-sensor.html` in your browser.
3.  **Connect:** Enter the IP address obtained from the Serial Monitor into the dashboard and click "Connect".

## 🤝 Partners & Sponsors

This project is proudly supported by and affiliated with:
- **Indian Institute of Technology Bombay (IIT Bombay)**
- **FOSSEE** (Free/Libre and Open Source Software for Education)
- **EduPyramids**
- **Spoken Tutorial**

## 🛡️ License & Copyright

Designed and developed by the **VitalSync Team** (Vellore, Tamil Nadu, India).
All rights reserved © 2026.
