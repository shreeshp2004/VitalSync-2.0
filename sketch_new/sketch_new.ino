/*
  VitalSync — Updated ESP8266 Firmware
  Adds /data JSON endpoint + CORS so browser can fetch directly.
  
  HOW TO USE:
  1. Flash this to your NodeMCU ESP8266
  2. Check Serial Monitor for the IP address (e.g. 192.168.1.45)
  3. Open live-sensor.html in browser
  4. Type that IP in the input box and click Connect

  SENSORS:
  - AD8232 ECG → Analog A0
  - DHT11 Temp/Humidity → D0 (GPIO0)
  - ADXL345 Accelerometer → I2C (D2=SDA, D1=SCL)
  - SSD1306 OLED → I2C 0x3C
*/

#include <ESP8266WiFi.h>
#include <Wire.h>
#include <DHT.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 64

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

#define DHTPIN       0
#define DHTTYPE      DHT11
#define ECG_PIN      A0
#define ADXL345_ADDR 0x53

// ── WiFi Credentials ──────────────────────────────────────────
const char* ssid     = "Daredevil";     // ← your WiFi name
const char* password = "23456789"; // ← your WiFi password
// ─────────────────────────────────────────────────────────────

WiFiServer server(80);
DHT dht(DHTPIN, DHTTYPE);

int16_t ax, ay, az;
int     ecgBuffer[25];   // rolling buffer for HR estimation
int     bufIdx = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Wire.begin(4, 5); // SDA=D2, SCL=D1
  dht.begin();

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("OLED not detected"));
    while (true);
  }
  display.clearDisplay();
  display.setTextColor(WHITE);

  initADXL();

  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n✅ WiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.println("Open live-sensor.html and enter: " + WiFi.localIP().toString());

  server.begin();
}

void initADXL() {
  Wire.beginTransmission(ADXL345_ADDR);
  Wire.write(0x2D); Wire.write(8);
  Wire.endTransmission();

  Wire.beginTransmission(ADXL345_ADDR);
  Wire.write(0x31); Wire.write(0);
  Wire.endTransmission();
}

void readAccel() {
  Wire.beginTransmission(ADXL345_ADDR);
  Wire.write(0x32);
  Wire.endTransmission(false);
  Wire.requestFrom((uint8_t)ADXL345_ADDR, (uint8_t)6);
  ax = Wire.read() | Wire.read() << 8;
  ay = Wire.read() | Wire.read() << 8;
  az = Wire.read() | Wire.read() << 8;
}

// Simple HR estimate from ECG peak count in buffer
int estimateHR(int* buf, int len) {
  int peaks = 0;
  for (int i = 1; i < len - 1; i++) {
    if (buf[i] > buf[i-1] && buf[i] > buf[i+1] && buf[i] > 600) peaks++;
  }
  return constrain(peaks * (60 * 1000 / (len * 5)), 40, 200);
}

void sendCORSHeaders(WiFiClient& client) {
  client.println("Access-Control-Allow-Origin: *");
  client.println("Access-Control-Allow-Methods: GET, OPTIONS");
  client.println("Cache-Control: no-cache");
}

void loop() {
  int ecg = analogRead(ECG_PIN);
  ecgBuffer[bufIdx % 25] = ecg;
  bufIdx++;

  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();
  readAccel();

  // Compute SVM (fall detection magnitude)
  float svm = sqrt((float)ax*ax + (float)ay*ay + (float)az*az) / 256.0;

  // OLED display
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);  display.print("T:"); display.print(temp, 1); display.print("C");
  display.setCursor(64, 0); display.print("H:"); display.print(hum, 0);  display.print("%");
  display.setCursor(0, 16); display.print("ECG:"); display.print(ecg);
  display.setCursor(0, 32); display.print("AX:"); display.print(ax);
  display.setCursor(0, 48); display.print("SVM:"); display.print(svm, 2);
  display.display();

  // Serial plotter — raw ECG
  Serial.println(ecg);

  // Web server
  WiFiClient client = server.available();
  if (client) {
    String req = "";
    while (client.connected()) {
      if (client.available()) {
        char c = client.read();
        req += c;
        if (req.endsWith("\r\n\r\n")) break;
      }
    }

    // ── /data → JSON endpoint (for live-sensor.html) ──────────
    if (req.indexOf("GET /data") >= 0) {
      int hr = estimateHR(ecgBuffer, 25);
      String json = "{";
      json += "\"ecg\":"  + String(ecg)         + ",";
      json += "\"temp\":" + String(temp, 1)      + ",";
      json += "\"hum\":"  + String(hum, 0)       + ",";
      json += "\"ax\":"   + String(ax)           + ",";
      json += "\"ay\":"   + String(ay)           + ",";
      json += "\"az\":"   + String(az)           + ",";
      json += "\"svm\":"  + String(svm, 3)       + ",";
      json += "\"hr\":"   + String(hr)           + ",";
      json += "\"ts\":"   + String(millis())     ;
      json += "}";

      client.println("HTTP/1.1 200 OK");
      client.println("Content-Type: application/json");
      sendCORSHeaders(client);
      client.println();
      client.print(json);

    // ── OPTIONS preflight ─────────────────────────────────────
    } else if (req.indexOf("OPTIONS") >= 0) {
      client.println("HTTP/1.1 204 No Content");
      sendCORSHeaders(client);
      client.println();

    // ── Root / → redirect to live page ───────────────────────
    } else {
      client.println("HTTP/1.1 200 OK");
      client.println("Content-Type: text/plain");
      sendCORSHeaders(client);
      client.println();
      client.println("VitalSync ESP8266 OK. Fetch /data for JSON.");
    }

    delay(1);
    client.stop();
  }

  delay(5);
}