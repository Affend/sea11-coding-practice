/**
 * Isi modul & starter code setiap topik.
 * Dipakai bersama oleh /learn/[module]/[topic] dan /exam/[module]/[topic].
 */
export interface TopicContent {
  description: string
  starterCode: string
  arduinoCode?: string
  learningObjectives: string[]
}

export const TOPIC_CONTENT: Record<string, TopicContent> = {
  'basics': {
    description: 'Pelajari struktur dasar program C, fungsi main(), dan cara mencetak output ke layar.',
    starterCode: `// Modul 1: Dasar C & Hello World
// Tujuan: Mengenal struktur program C

#include <stdio.h>

int main() {
    // TODO: Cetak "SEA Laboratory" ke layar
    // Gunakan printf()
    
    // TODO: Cetak "Algoritma & Pemrograman C" di baris baru
    
    // TODO: Cetak "Struktur Data Arduino UNO" di baris baru
    
    return 0;
}`,
    learningObjectives: [
      'Memahami struktur dasar program C',
      'Menggunakan fungsi printf() untuk output',
      'Mengenal escape sequence (\\n, \\t, dll)',
      'Kompilasi dan eksekusi program pertama',
    ],
  },
  'variables': {
    description: 'Belajar tipe data fundamental: int, float, double, char, dan cara deklarasi variabel.',
    starterCode: `// Modul 2: Variabel & Tipe Data
// Tujuan: Menguasai tipe data dan variabel

#include <stdio.h>

int main() {
    // TODO: Deklarasikan variabel:
    // - int untuk umur
    // - float untuk tinggi badan
    // - char untuk inisial nama
    // - double untuk nilai presisi tinggi
    
    // TODO: Assign nilai ke variabel
    
    // TODO: Cetak semua variabel dengan format specifier yang benar
    // %d untuk int, %f untuk float, %c untuk char, %lf untuk double
    
    return 0;
}`,
    learningObjectives: [
      'Mengenal tipe data fundamental C',
      'Deklarasi dan inisialisasi variabel',
      'Format specifier untuk printf/scanf',
      'Konversi tipe data implisit dan eksplisit',
    ],
  },
  'control-flow': {
    description: 'Menguasai percabangan (if-else, switch) dan perulangan (for, while, do-while).',
    starterCode: `// Modul 3: Kontrol Aliran
// Tujuan: Menguasai if-else, switch, dan loop

#include <stdio.h>

int main() {
    int nilai = 85;
    
    // TODO: If-else untuk grade
    // A: 85-100, B: 70-84, C: 55-69, D: 40-54, E: <40
    
    // TODO: Switch case untuk hari (1-7)
    
    // TODO: For loop cetak 1-10
    // TODO: While loop hitung mundur 10-1
    // TODO: Do-while untuk menu
    
    return 0;
}`,
    learningObjectives: [
      'Percabangan if, else if, else',
      'Switch case untuk multiple conditions',
      'Perulangan for, while, do-while',
      'Break dan continue',
      'Nested loops',
    ],
  },
  'arduino-basics': {
    description: 'Kenali Arduino UNO, pin digital/analog, dan struktur program setup() dan loop().',
    starterCode: `// Modul 1: Dasar Arduino & Setup
// Tujuan: Mengenal Arduino UNO dan struktur program

#include <Arduino.h>

const int LED_PIN = 13;

void setup() {
    // Inisialisasi pin
    pinMode(LED_PIN, OUTPUT);
    
    // Mulai komunikasi serial
    Serial.begin(9600);
    
    Serial.println("Arduino SIAP!");
}

void loop() {
    // TODO: Nyala LED
    digitalWrite(LED_PIN, HIGH);
    
    // TODO: Delay 1 detik
    delay(1000);
    
    // TODO: Matikan LED
    digitalWrite(LED_PIN, LOW);
    
    // TODO: Delay 1 detik
    delay(1000);
}`,
    arduinoCode: `// Modul 1: Dasar Arduino & Setup
#include <Arduino.h>

const int LED_PIN = 13;

void setup() {
    pinMode(LED_PIN, OUTPUT);
    Serial.begin(9600);
    Serial.println("Arduino SIAP!");
}

void loop() {
    digitalWrite(LED_PIN, HIGH);
    delay(1000);
    digitalWrite(LED_PIN, LOW);
    delay(1000);
}`,
    learningObjectives: [
      'Arsitektur Arduino UNO (ATmega328P)',
      'Pin digital vs analog',
      'Fungsi setup() dan loop()',
      'Serial communication',
      'Digital I/O: pinMode, digitalWrite, digitalRead',
    ],
  },
  'arrays-arduino': {
    description: 'Manipulasi array di Arduino, buffer sirkuler untuk data sensor.',
    starterCode: `// Modul 2: Array & Buffer Sirkuler
// Tujuan: Menguasai array di memori terbatas

#include <Arduino.h>

const int BUFFER_SIZE = 10;
int sensorBuffer[BUFFER_SIZE];
int bufferIndex = 0;
int bufferCount = 0;

void setup() {
    Serial.begin(9600);
    // Inisialisasi buffer
    for (int i = 0; i < BUFFER_SIZE; i++) {
        sensorBuffer[i] = 0;
    }
}

void loop() {
    // Simulasi baca sensor (0-1023)
    int sensorValue = analogRead(A0);
    
    // TODO: Masukkan ke buffer sirkuler
    // bufferIndex = (bufferIndex + 1) % BUFFER_SIZE;
    
    // TODO: Hitung rata-rata
    // float sum = 0;
    // for (int i = 0; i < bufferCount; i++) sum += sensorBuffer[i];
    
    Serial.print("Sensor: ");
    Serial.print(sensorValue);
    // Serial.print(" | Rata-rata: ");
    // Serial.println(avg);
    
    delay(100);
}`,
    arduinoCode: `// Modul 2: Array & Buffer Sirkuler
#include <Arduino.h>

const int BUFFER_SIZE = 10;
int sensorBuffer[BUFFER_SIZE];
int bufferIndex = 0;
int bufferCount = 0;

void setup() {
    Serial.begin(9600);
    for (int i = 0; i < BUFFER_SIZE; i++) sensorBuffer[i] = 0;
}

void loop() {
    int sensorValue = analogRead(A0);
    sensorBuffer[bufferIndex] = sensorValue;
    bufferIndex = (bufferIndex + 1) % BUFFER_SIZE;
    if (bufferCount < BUFFER_SIZE) bufferCount++;
    
    float sum = 0;
    for (int i = 0; i < bufferCount; i++) sum += sensorBuffer[i];
    float avg = sum / bufferCount;
    
    Serial.print("Sensor: ");
    Serial.print(sensorValue);
    Serial.print(" | Avg: ");
    Serial.println(avg);
    
    delay(100);
}`,
    learningObjectives: [
      'Array statis di Arduino (memori SRAM 2KB)',
      'Buffer sirkuler (circular buffer)',
      'Moving average filter',
      'Optimasi memori untuk embedded',
    ],
  },
}
