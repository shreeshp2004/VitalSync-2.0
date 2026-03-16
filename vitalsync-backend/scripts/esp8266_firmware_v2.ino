/*
 * VitalSync ESP8266 Firmware v2.0 — Phase 2
 * Updated to POST to cloud backend API
 * Hardware: ESP8266 NodeMCU + AD8232 + ADXL345 + DHT11 + SSD1306
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_ADXL345_U.h>
#include <DHT.h>

// ── Configuration ─────────────────────────────────────────────────
const char* WIFI_SSID    = "YOUR_WIFI_SSID";          // ← set to your WiFi name
const char* WIFI_PASS    = "YOUR_WIFI_PASSWORD";       // ← set to your WiFi password
const char* API_URL      = "https://your-api.railway.app/api/ingest";  // ← Railway URL
const char* DEVICE_TOKEN = "YOUR_DEVICE_TOKEN_HERE";  // ← from /api/devices/register

// Pin definitions
#define ECG_PIN    A0    // AD8232 output
#define DHT_PIN    D4    // DHT11 data
#define DHT_TYPE   DHT11
#define SDA_PIN    D2    // I2C SDA
#define SCL_PIN    D1    // I2C SCL

// Sampling config
#define ECG_SAMPLE_RATE_MS  10   // 100Hz ECG sampling
#define POST_INTERVAL_MS   250   // POST every 250ms (25 ECG samples)
#define ECG_BATCH_SIZE      25

Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);
DHT dht(DHT_PIN, DHT_TYPE);

int   ecgBuffer[ECG_BATCH_SIZE];
int   ecgIdx = 0;
unsigned long lastSample = 0;
unsigned long lastPost   = 0;
bool  wifiOK = false;

// ── HR estimation from ECG samples ────────────────────────────────
int estimateHR(int* buf, int n, int fs = 100) {
  int threshold = 512;
  int peaks = 0;
  bool above = false;
  for (int i = 0; i < n; i++) {
    if (buf[i] > threshold + 60 && !above) { peaks++; above = true; }
    if (buf[i] < threshold - 60)           { above = false; }
  }
  float secs = (float)n / fs;
  return secs > 0 ? (int)(peaks * 60.0f / secs) : 0;
}

// ── Setup ──────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);
  dht.begin();

  if (!accel.begin()) {
    Serial.println("ADXL345 not found — check wiring");
  }
  accel.setRange(ADXL345_RANGE_2_G);

  // Connect WiFi
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500); Serial.print("."); attempts++;
  }
  wifiOK = (WiFi.status() == WL_CONNECTED);
  Serial.println(wifiOK ? "\nWiFi OK" : "\nWiFi FAILED — running offline");
}

// ── Main loop ──────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // Sample ECG at 100Hz
  if (now - lastSample >= ECG_SAMPLE_RATE_MS && ecgIdx < ECG_BATCH_SIZE) {
    ecgBuffer[ecgIdx++] = analogRead(ECG_PIN);
    lastSample = now;
  }

  // POST to cloud every 250ms when we have a full batch
  if (ecgIdx >= ECG_BATCH_SIZE && now - lastPost >= POST_INTERVAL_MS) {
    lastPost = now;

    sensors_event_t event;
    float accelX = 0, accelY = 0, accelZ = 0;
    if (accel.getEvent(&event)) {
      accelX = event.acceleration.x / 9.81f;
      accelY = event.acceleration.y / 9.81f;
      accelZ = event.acceleration.z / 9.81f;
    }

    float temp     = dht.readTemperature();
    float humidity = dht.readHumidity();
    if (isnan(temp))     temp     = 25.0f;
    if (isnan(humidity)) humidity = 50.0f;

    int hr = estimateHR(ecgBuffer, ECG_BATCH_SIZE);

    // Build JSON payload
    StaticJsonDocument<768> doc;
    doc["hr"]       = hr;
    doc["spo2"]     = 98.0;   // placeholder until MAX30102 added
    doc["hrv"]      = 0;      // computed server-side from RR intervals
    doc["temp"]     = round(temp * 10.0f) / 10.0f;
    doc["humidity"] = round(humidity * 10.0f) / 10.0f;
    doc["ax"]       = round(accelX * 1000.0f) / 1000.0f;
    doc["ay"]       = round(accelY * 1000.0f) / 1000.0f;
    doc["az"]       = round(accelZ * 1000.0f) / 1000.0f;

    JsonArray ecgArr = doc.createNestedArray("ecg_batch");
    for (int i = 0; i < ECG_BATCH_SIZE; i++) ecgArr.add(ecgBuffer[i]);

    String body;
    serializeJson(doc, body);

    if (wifiOK && WiFi.status() == WL_CONNECTED) {
      WiFiClientSecure client;
      client.setInsecure(); // TODO: add certificate fingerprint for production
      HTTPClient http;
      http.begin(client, API_URL);
      http.addHeader("Content-Type", "application/json");
      http.addHeader("X-Device-Token", DEVICE_TOKEN);
      int code = http.POST(body);
      http.end();

      Serial.printf("[POST] %d | HR:%d bpm T:%.1f°C H:%.0f%% ax:%.2f\n",
                    code, hr, temp, humidity, accelX);
    } else {
      // Print to Serial for offline debugging
      Serial.println(body);
    }

    ecgIdx = 0;  // reset batch
  }
}
