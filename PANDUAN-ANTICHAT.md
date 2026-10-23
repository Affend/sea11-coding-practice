# Panduan Sea11 Coding Practice — Mode Ujian & Anti-Cheat

Panduan untuk asisten/asisten lab menjalankan aplikasi coding practice beserta sistem
monitoring kejujuran peserta (mode ujian bergaya Safe Exam Browser).

---

## 1. Menjalankan Server di Komputer Admin (Server LAN)

Buka terminal **di komputer admin** lalu jalankan:

```powershell
cd "C:\Users\acer\Documents\SEA Riset 11\sea11-coding-practice"
cmd /c "npm.cmd run dev -- --hostname 0.0.0.0"
```

Catatan penting:
- **Wajib** melalui `cmd /c "npm.cmd ..."` — PowerShell memblokir `.ps1` shim npm
  (execution policy). Kalau mengetik `npm run dev` langsung, akan muncul error
  `npm.ps1 cannot be loaded`.
- Opsi `--hostname 0.0.0.0` membuat server bisa diakses laptop praktikan via LAN.
- Aplikasi berjalan di port **3000**. Jika terbentur dipakai, Next.js otomatis
  memilih 3001 dan mencetak portnya di banner terminal.

### Akses
| Pihak | URL |
|---|---|
| Komputer admin (lokal) | `http://localhost:3000` |
| Laptop praktikan (via LAN) | `http://<IP-komputer-admin>:3000` — mis. `http://192.168.1.10:3000` |

Cek IP server: `ipconfig` → bagian *IPv4 Address* pada adapter WiFi/LAN.

> Firewall handler: kalau laptop praktikan tidak bisa membuka halaman, izinkan Node.js
> di Windows Defender Firewall (inbound port 3000) sekali saja pada komputer admin.
> Untuk produksi, sarankan menjalankan build: `npm.cmd run build` lalu
> `npm.cmd run start -- --hostname 0.0.0.0` (dev server lebih lambat).

---

## 2. Alur Praktikan — Mode Ujian

1. Buka `http://<IP-server>:3000` → sidebar → **Mode Ujian** (atau langsung `/exam`).
2. Pilih modul & topik yang ada soalnya (topik tanpa soal tampil redup).
3. Isi **Nama + NIM + Kelas**, lalu klik **"Masuk Layar Penuh & Mulai"**:
   - Browser melakukan login ke server, sesi dibuat, dan layar penuh (fullscreen) terkunci.
4. Praktikan mengerjakan di editor sebelah kanan; **modul (materi) tetap terbuka
   di kiri sebagai sumber jawaban**.
5. Tombol: **Jalankan (Ctrl+Enter)** — kompilasi via clang WASM di browser;
   **Berhenti** — batalkan eksekusi; **Reset** — kembalikan kodeke starter.
6. Untuk topik Arduino ada tab **Arduino** berjalan simulator; untuk C tab **Konsol**.
7. Selesai → **Akhiri Ujian** di banner → konfirmasi → layar penuh dilepas dan
   ringkasan (durasi, jumlah catatan info/kuning/merah) ditampilkan.

### Aturan copy-paste
- Copy & paste **diizinkan** supaya praktikan bisa menyalin dari modul ke editor.
- **Semua** aktivitas copy/paste dicatat (waktu, panjang teks, pratinjau 80 karakter).
- Sistem menyimpan teks terakhir yang dikopi *di dalam aplikasi*; paste yang cocok
  dicatat **hijau (info)** — "paste dari modul".
- Paste yang berasal dari **luar aplikasi** (mesin pencari, ChatGPT, dokumen, dll.)
  dicatat **kuning (warning)** + pratinjau isinya untuk admin. (Tetap boleh; hanya ditandai.)
- Praktikan akan melihat toast kecil di atas layar untuk setiap kejadian.

### Yang dicatat sebagai pelanggaran merah (danger)
- **Keluar dari layar penuh** saat ujian berjalan (overlay muncul, sistem mencoba
  kembali masuk ke layar penuh secara otomatis).
- **Pindah tab / minimalkan jendela** (tab disembunyikan).
- Menekan refresh menampilkan dialog konfirmasi browser, dan aktivitas tersebut
  juga tercatat (sesi dilanjutkan, bukan hilang — identitas tersimpan di browser).

---

## 3. Panel Admin — Memantau Kecurangan

1. Buka `/admin` (atau lewat sidebar → **Panel Admin**).
2. Masukkan password. **Default: `sea11-admin`**.
3. Daftar sesi tampil terbaru di atas, auto-refresh tiap 5 detik (bisa dimatikan).

### Level risiko per sesi (badge)
| Badge | Arti |
|---|---|
| **Aman** (hijau) | Tidak ada pelanggaran keras. |
| **Waspada** (kuning) | ≥1 warning (mis. paste dari luar) atau banyak aktivitas aneh. |
| **Diduga Curang** (merah) | ≥3 danger (keluar fullscreen/pindah tab berulang) atau banyak warning. |

Skrip internal: `danger >= 3 || warning >= 10` → diduga curang; `danger >= 1 || warning >= 4` → waspada.

4. Klik baris sesi untuk membuka **timeline kejadian** (waktu, jenis, detail,
   pratinjau paste luar). Contoh jenis: `Keluar layar penuh`, `Pindah/sembunyikan
   tab`, `Paste dari luar aplikasi`, `Copy teks`, `Reload halaman`.
5. **CSV** untuk mengekspor laporan sesi (ringkasan per sesi, bukan timeline).

---

## 4. Konfigurasi & Data

| Hal | Lokasi / Cara |
|---|---|
| Password admin | Env var `ADMIN_PASSWORD` di terminal server. Tanpa env var, default `sea11-admin`. Set via: `cmd /c "set ADMIN_PASSWORD=rahasiasaya&& npm.cmd run dev -- --hostname 0.0.0.0"` |
| Basis data | `data/sea11.db` (SQLite, better-sqlite3, WAL). Tabel `participants`, `exam_sessions`, `exam_events`. |
| API ujian | `POST /api/exam/login`, `POST /api/exam/start`, `POST /api/exam/events`, `POST /api/exam/end` |
| API admin | `GET /api/admin/sessions`, `GET /api/admin/sessions/:id` (header `x-admin-key`) |
| Snapshot kode terakhir | Disimpan di kolom `code_snapshot` saat sesi berakhir. |
| Sesi tertinggal | Mulai sesi baru menandai sesi 'aktif' lama milik praktikan yang sama sebagai `terlupakan`. |

---

## 5. Limitasi vs Safe Exam Browser Desktop

Aplikasi ini **berbasis web**, jadi wajar ada batas:

- Browser menyimpan/mengizinkan keluar-masuk fullscreen; ketika praktikan keluar,
  sistem otomatis mencoba kembali masuk dan event tercatat — tetapi dia **bisa
  menolak prompt browser** (perlu klik). Lindungi dengan observasi langsung.
- Kamera/microphone tidak tersedia (itulah fitur SEB desktop asli).
- **Untuk pemblokiran OS-level (Alt+Tab / Win key), gunakan SEA Lock — SEB-lite
  natif. Lihat bagian 5.1 di bawah.**

---

## 5.1 SEA Lock — SEB-lite Natif (Blok Alt+Tab Keras)

Program natif Windows kecil di folder `tools\seb-lite\` yang memblok navigasi
keluar **di level sistem operasi** — pendekatan yang sama dipakai Safe Exam
Browser asli. Selama mode ujian aktif:

| Yang diblok | Status |
|---|---|
| **Alt+Tab, Alt+F4, Alt+Esc, Alt+Space** | ✅ diblok |
| **Tombol Windows kiri/kanan + tombol menu konteks** | ✅ diblok |
| **Ctrl+Esc, F12 (DevTools), Ctrl+P/S/N/O/L/T/W/F di browser** | ✅ diblok |
| **Taskbar** | ✅ disembunyikan selama ujian |
| Edge **kiosk fullscreen** ke URL ujian | ✅ otomatis dibuka |
| Edge ditutup paksa | ✅ watchdog menyalakan ulang |
| **Ctrl+Shift+U** | 🔑 dialog kode admin — kode benar = hook dilepas, taskbar tampil, Edge ditutup, app keluar |

Catatan teknis: `Ctrl+Alt+Del` **tidak bisa** diblok oleh program mana pun di
level user (desain keamanan Windows). Praktikan yang menekan Ctrl+Alt+Del hanya
sampai ke layar biru (Lock/Sign-out), tidak bisa pindah aplikasi dengan nyaman,
dan kejadian itu terlihat oleh asisten.

### Setup sekali per laptop praktikan

1. Salin folder `tools\seb-lite\` ke laptop praktikan (bisa via flashdisk).
2. Salin `contoh-sealock.ini` → `sealock.ini`, lalu isi:
   ```ini
   url=http://192.168.1.100:3000/exam   ; ganti IP server admin + topik ujian
   password=sea11-admin                 ; sama dengan ADMIN_PASSWORD server
   ```
3. **Klik kanan `start-exam.bat` → Run as administrator**. Skrip otomatis
   mengompilasi `sea-lock.exe` dengan `csc.exe` bawaan .NET Framework — tidak
   perlu install apa pun.

### Alur tiap sesi ujian

1. Siapkan sesi di panel admin / bagikan soal seperti biasa.
2. Jalankan `start-exam.bat` di laptop praktikan. Layar akan:
   - menampilkan jendela hitam "Mode Ujian SEA Aktif",
   - membuka Edge fullscreen ke URL ujian,
   - mematikan Alt+Tab / tombol Windows / taskbar.
3. Praktikan mengerjakan di Edge (event monitoring web tetap aktif dan tercatat
   di server seperti biasa).
4. Selesai / diganti aturan: asisten menekan **Ctrl+Shift+U**, mengisi kode
   admin → semua kembali normal.

### Pemecahan masalah

| Gejala | Solusi |
|---|---|
| Hook gagal ("Gagal memasang hook keyboard") | Jalankan **as Administrator** |
| Taskbar tidak muncul setelah aplikasi ditutup paksa (crash) | Restart Explorer: Ctrl+Shift+Esc → File → Jalankan `explorer` |
| Edge tidak terbuka | Pastikan Microsoft Edge terpasang (bawaan Windows 10/11) |
| Galat URL salah | Edit `sealock.ini` bagian `url=` |
| Kompilasi gagal | Pastikan .NET Framework 4.x terpasang (normalnya sudah bawaan Windows) |

### Source

- `tools\seb-lite\sea-lock.cs` — full source (WinForms + Win32 `WH_KEYBOARD_LL` hook).
- `tools\seb-lite\build.bat` — kompilasi manual.
- `tools\seb-lite\start-exam.bat` — launcher.
- Kompilasi dioptimize: `/target:winexe /optimize+`, hasil `sea-lock.exe` ±15KB.

---

## 6. Pembersihan & Dev Note

- `npm run lint` (via `cmd /c "npm.cmd run lint"`) — belasan warning memang
  pre-existing di file lama (`page.tsx`, `CodeEditor.tsx`, `Console.tsx`,
  `useCExecution.ts`, `store.ts`), semua *warning* mengenai `any`, variabel
  tak terpakai, `allOutput` memo — **tidak ada error**, dan `tsc --noEmit` bersih.
- Simulator Arduino mengeksekusi kode **sungguhan** (interpreter subset C++ di
  `src/lib/arduino-interpreter.ts`): `setup()/loop()`, pin I/O, `Serial.*`, array,
  fungsi buatan, dsb. Program tanpa `delay()` di dalam `loop()` akan dibatasi dengan
  jeda mikro agar CPU tidak 100%.
