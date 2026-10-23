//
// SEA Lock v1.0 — SEB-lite untuk Lab SEA Divisi Riset
// ====================================================
// Program natif Windows (WinForms + Win32 low-level keyboard hook) yang:
//   1. Memasang hook keyboard sistem: memblok Alt+Tab, Alt+F4, Win key,
//      Alt+Esc, Ctrl+Esc, Alt+Space, F12, Ctrl+P/S/N/O/L/T/W/F selama ujian.
//   2. Menyembunyikan taskbar (Shell_TrayWnd) selama ujian.
//   3. Menjalankan Microsoft Edge kiosk fullscreen ke URL ujian (sealock.ini).
//   4. Watchdog: bila Edge dimatikan/ditutup paksa, dijalankan ulang otomatis.
//   5. Pintu admin: Ctrl+Shift+U -> dialog kode admin (password= di sealock.ini).
//      Kode benar -> hook dilepas, taskbar kembali, Edge ditutup, aplikasi keluar.
//
// Catatan: Ctrl+Alt+Del tidak bisa diblok dari aplikasi level user (by design).
// Kompilasi: build.bat (csc.exe .NET Framework 4.x — bahasa C# 5)
//
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace SeaLock
{
    public static class Lock
    {
        // ---------- Win32 P/Invoke ----------
        [DllImport("user32.dll", SetLastError = true)]
        private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);
        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool UnhookWindowsHookEx(IntPtr hhk);
        [DllImport("user32.dll")]
        private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
        private static extern IntPtr GetModuleHandle(string lpModuleName);
        [DllImport("user32.dll")]
        private static extern short GetAsyncKeyState(int vKey);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        private static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

        private const int WH_KEYBOARD_LL = 13;
        private const int WM_KEYDOWN = 0x0100;
        private const int WM_SYSKEYDOWN = 0x0104;

        private const int VK_SHIFT = 0x10;
        private const int VK_CONTROL = 0x11;
        private const int VK_MENU = 0x12;   // Alt
        private const int VK_ESCAPE = 0x1B;
        private const int VK_SPACE = 0x20;
        private const int VK_LWIN = 0x5B;
        private const int VK_RWIN = 0x5C;
        private const int VK_APPS = 0x5D;
        private const int VK_TAB = 0x09;
        private const int VK_RETURN = 0x0D;
        private const int VK_F4 = 0x73;
        private const int VK_F12 = 0x7B;
        private const int VK_U = 0x55;

        private const int SW_HIDE = 0;
        private const int SW_SHOW = 5;

        [StructLayout(LayoutKind.Sequential)]
        private struct KBDLLHOOKSTRUCT
        {
            public uint vkCode;
            public uint scanCode;
            public uint flags;
            public uint time;
            public IntPtr dwExtraInfo;
        }

        // ---------- State ----------
        private static IntPtr hHook = IntPtr.Zero;
        private static LowLevelKeyboardProc hookProc;
        private static volatile bool locked = true;
        private static string adminPassword = "sea11-admin";
        private static string examUrl = "";
        private static IntPtr hTaskbar = IntPtr.Zero;
        private static Process edgeProcess = null;
        private static bool edgeWasStarted = false;
        private static string edgeKioskArgs = "";

        private static bool IsKeyDown(int vk)
        {
            return (GetAsyncKeyState(vk) & 0x8000) != 0;
        }

        // ---------- Keyboard hook ----------
        private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
        {
            if (nCode >= 0 && locked)
            {
                int msg = wParam.ToInt32();
                if (msg == WM_KEYDOWN || msg == WM_SYSKEYDOWN)
                {
                    object raw = Marshal.PtrToStructure(lParam, typeof(KBDLLHOOKSTRUCT));
                    KBDLLHOOKSTRUCT info = (KBDLLHOOKSTRUCT)raw;
                    uint vk = info.vkCode;

                    bool alt = IsKeyDown(VK_MENU);
                    bool ctrl = IsKeyDown(VK_CONTROL);
                    bool shift = IsKeyDown(VK_SHIFT);

                    // Ctrl+Shift+U = pintu kode admin -> telan agar tak sampai browser
                    if (ctrl && shift && vk == VK_U) return (IntPtr)1;

                    bool blockedBrowserCombo =
                        (alt && (vk == VK_TAB || vk == VK_F4 || vk == VK_ESCAPE || vk == VK_SPACE || vk == VK_RETURN)) ||
                        (ctrl && vk == VK_ESCAPE) ||
                        vk == VK_LWIN || vk == VK_RWIN || vk == VK_APPS ||
                        vk == VK_F12 ||
                        (ctrl && (vk == 'P' || vk == 'S' || vk == 'N' || vk == 'O' ||
                                  vk == 'L' || vk == 'T' || vk == 'W' || vk == 'F'));

                    if (blockedBrowserCombo) return (IntPtr)1; // telan tombol
                }
            }
            return CallNextHookEx(hHook, nCode, wParam, lParam);
        }

        private static void InstallHook()
        {
            hookProc = new LowLevelKeyboardProc(HookCallback);
            using (Process cur = Process.GetCurrentProcess())
            using (ProcessModule mod = cur.MainModule)
            {
                hHook = SetWindowsHookEx(WH_KEYBOARD_LL, hookProc, GetModuleHandle(mod.ModuleName), 0);
            }
            if (hHook == IntPtr.Zero)
            {
                int err = Marshal.GetLastWin32Error();
                MessageBox.Show(
                    "Gagal memasang hook keyboard (code " + err + ").\n" +
                    "Klik kanan build.bat -> Run as administrator lalu jalankan ulang.",
                    "SEA Lock", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private static void RemoveHook()
        {
            if (hHook != IntPtr.Zero)
            {
                UnhookWindowsHookEx(hHook);
                hHook = IntPtr.Zero;
            }
        }

        // ---------- Konfigurasi sealock.ini ----------
        private static void ReadConfig()
        {
            string iniPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "sealock.ini");
            if (File.Exists(iniPath))
            {
                string[] lines = File.ReadAllLines(iniPath);
                for (int i = 0; i < lines.Length; i++)
                {
                    string line = lines[i].Trim();
                    if (line.Length == 0 || line[0] == '#' || line[0] == ';') continue;
                    int eq = line.IndexOf('=');
                    if (eq <= 0) continue;
                    string key = line.Substring(0, eq).Trim().ToLowerInvariant();
                    string val = line.Substring(eq + 1).Trim();
                    if (key == "password") adminPassword = val;
                    else if (key == "url") examUrl = val;
                }
            }
            if (examUrl.Length == 0) examUrl = "http://localhost:3000";

            string profileDir = Path.Combine(Path.GetTempPath(), "sea-exam-edge");
            if (!Directory.Exists(profileDir)) Directory.CreateDirectory(profileDir);

            edgeKioskArgs =
                "--kiosk \"" + examUrl + "\" " +
                "--edge-kiosk-type=fullscreen " +
                "--no-first-run --no-default-browser-check " +
                "--autoplay-policy=no-user-gesture-required " +
                "--user-data-dir=\"" + profileDir + "\"";
        }

        // ---------- Edge kiosk ----------
        private static string FindEdge()
        {
            string[] candidates = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe")
            };
            for (int i = 0; i < candidates.Length; i++)
            {
                if (File.Exists(candidates[i])) return candidates[i];
            }
            return null;
        }

        private static void StartEdge()
        {
            lock (thisLock)
            {
                string edge = FindEdge();
                if (edge == null)
                {
                    MessageBox.Show("Microsoft Edge tidak ditemukan di laptop ini.\nWindows biasanya sudah menyediakannya.",
                        "SEA Lock", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }
                try
                {
                    edgeProcess = Process.Start(new ProcessStartInfo(edge, edgeKioskArgs) { UseShellExecute = true });
                    edgeWasStarted = true;
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Gagal menjalankan Edge: " + ex.Message,
                        "SEA Lock", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
        }

        private static readonly object thisLock = new object();

        private static void KillEdge()
        {
            if (!edgeWasStarted) return;
            try
            {
                if (edgeProcess != null && !edgeProcess.HasExited)
                {
                    edgeProcess.Kill();
                    Process.Start(new ProcessStartInfo("taskkill", "/F /T /PID " + edgeProcess.Id)
                    {
                        CreateNoWindow = true,
                        UseShellExecute = false
                    });
                }
            }
            catch { }
        }

        // ---------- Watchdog: nyalakan ulang Edge bila dimatikan paksa ----------
        private static void WatchdogTick(object state)
        {
            if (!locked || !edgeWasStarted) return;
            bool alive = false;
            try
            {
                Process[] all = Process.GetProcessesByName("msedge");
                alive = all.Length > 0;
                for (int i = 0; i < all.Length; i++) { try { all[i].Dispose(); } catch { } }
            }
            catch { }
            if (!alive) StartEdge();
        }

        // ---------- Cleanup / unlock ----------
        private static void Cleanup()
        {
            locked = false;
            RemoveHook();
            if (hTaskbar != IntPtr.Zero)
            {
                ShowWindow(hTaskbar, SW_SHOW);
                hTaskbar = IntPtr.Zero;
            }
            KillEdge();
            edgeWasStarted = false;
        }

        public static void Unlock()
        {
            Cleanup();
        }

        public static void OnExit()
        {
            Cleanup();
        }

        public static bool IsLocked { get { return locked; } }
        public static string AdminPassword { get { return adminPassword; } }
        public static string ExamUrl { get { return examUrl; } }

        // ---------- Main ----------
        [STAThread]
        private static void Main()
        {
            ReadConfig();
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            InstallHook();

            hTaskbar = FindWindow("Shell_TrayWnd", null);
            if (hTaskbar != IntPtr.Zero) ShowWindow(hTaskbar, SW_HIDE);
            StartEdge();

            System.Threading.Timer watchdog = new System.Threading.Timer(WatchdogTick, null, 15000, 15000);

            using (LockForm form = new LockForm())
            {
                form.UnlockSucceeded += delegate { Application.Exit(); };
                form.FormClosed += delegate { Lock.OnExit(); };
                Application.Run(form);
            }

            watchdog.Dispose();
        }
    }

    // ---------- Form fullscreen pengganti desktop penuh ----------
    public class LockForm : Form
    {
        private System.Windows.Forms.Timer pollTimer;
        private bool wasU;
        public event EventHandler UnlockSucceeded;

        public LockForm()
        {
            SuspendLayout();

            FormBorderStyle = FormBorderStyle.None;
            WindowState = FormWindowState.Maximized;
            StartPosition = FormStartPosition.Manual;
            Bounds = SystemInformation.VirtualScreen;
            TopMost = true;
            BackColor = Color.FromArgb(13, 17, 23);

            Label title = new Label();
            title.Text = "Mode Ujian SEA Aktif";
            title.ForeColor = Color.FromArgb(0, 168, 85);
            title.Font = new Font("Consolas", 22F, FontStyle.Bold);
            title.AutoSize = true;
            title.TextAlign = ContentAlignment.MiddleCenter;

            Label info = new Label();
            info.Text = "Navigasi keluar (Alt+Tab / tombol Windows) dimatikan selama ujian.\n" +
                        "Selesaikan tugas di aplikasi.\n\n" +
                        "Kode admin diperlukan untuk membuka (Ctrl+Shift+U).";
            info.ForeColor = Color.FromArgb(160, 170, 180);
            info.Font = new Font("Segoe UI", 11.5F);
            info.TextAlign = ContentAlignment.MiddleCenter;
            info.AutoSize = false;
            info.Size = new Size(660, 110);

            Controls.Add(title);
            Controls.Add(info);
            ResumeLayout();

            Load += delegate
            {
                title.Location = new Point((Width - title.Width) / 2, Height / 2 - 110);
                info.Location = new Point((Width - info.Width) / 2, Height / 2 - 40);
            };

            // Alt+F4/Ctrl+Esc ditiadakan oleh keyboard hook; tanpa cancel handler
            // agar Application.Exit setelah unlock tetap beres.

            // poll Ctrl+Shift+U untuk dialog kode admin
            pollTimer = new System.Windows.Forms.Timer();
            pollTimer.Interval = 250;
            pollTimer.Tick += PollForShortcut;
            pollTimer.Start();
        }

        private void PollForShortcut(object sender, EventArgs e)
        {
            bool ctrl = (GetKeyState(0x11) & 0x8000) != 0;
            bool shift = (GetKeyState(0x10) & 0x8000) != 0;
            bool u = (GetKeyState(0x55) & 0x8000) != 0;
            if (ctrl && shift && u && !wasU)
            {
                wasU = true;
                ShowUnlockDialog();
            }
            else if (!u)
            {
                wasU = false;
            }
        }

        [DllImport("user32.dll")]
        private static extern short GetKeyState(int vk);

        private void ShowUnlockDialog()
        {
            using (UnlockDialog dlg = new UnlockDialog())
            {
                dlg.StartPosition = FormStartPosition.CenterScreen;
                dlg.TopMost = true;
                Activate();
                DialogResult dr = dlg.ShowDialog(this);
                if (dr == DialogResult.OK)
                {
                    Lock.Unlock();
                    if (UnlockSucceeded != null) UnlockSucceeded(this, EventArgs.Empty);
                }
            }
        }
    }

    // ---------- Dialog kode admin ----------
    public class UnlockDialog : Form
    {
        private TextBox txtKode;
        private Label lblStatus;

        public UnlockDialog()
        {
            SuspendLayout();

            Text = "SEA Lock — Kode Admin";
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MinimizeBox = false;
            MaximizeBox = false;
            ShowInTaskbar = false;
            BackColor = Color.FromArgb(13, 17, 23);
            ClientSize = new Size(390, 150);

            Label lbl = new Label();
            lbl.Text = "Masukkan kode admin untuk membuka:";
            lbl.ForeColor = Color.White;
            lbl.Font = new Font("Segoe UI", 10F);
            lbl.AutoSize = true;
            lbl.Location = new Point(16, 16);

            txtKode = new TextBox();
            txtKode.Location = new Point(16, 44);
            txtKode.Width = 260;
            txtKode.UseSystemPasswordChar = true;
            txtKode.Font = new Font("Consolas", 11F);
            txtKode.KeyDown += delegate(object s, KeyEventArgs e)
            {
                if (e.KeyCode == Keys.Return) TryUnlock();
            };

            Button btn = new Button();
            btn.Text = "Buka";
            btn.Location = new Point(290, 42);
            btn.Width = 84;
            btn.Height = 26;
            btn.BackColor = Color.FromArgb(0, 168, 85);
            btn.ForeColor = Color.White;
            btn.FlatStyle = FlatStyle.Flat;
            btn.Click += delegate { TryUnlock(); };

            lblStatus = new Label();
            lblStatus.ForeColor = Color.FromArgb(255, 100, 100);
            lblStatus.Font = new Font("Segoe UI", 9F);
            lblStatus.AutoSize = false;
            lblStatus.Size = new Size(360, 20);
            lblStatus.Location = new Point(16, 84);

            Controls.Add(lbl);
            Controls.Add(txtKode);
            Controls.Add(btn);
            Controls.Add(lblStatus);

            AcceptButton = btn;
            CancelButton = btn;
            ResumeLayout();
        }

        private void TryUnlock()
        {
            if (txtKode.Text == Lock.AdminPassword)
            {
                DialogResult = DialogResult.OK;
                Close();
            }
            else
            {
                lblStatus.Text = "Kode salah. Coba lagi.";
                txtKode.SelectAll();
                txtKode.Focus();
            }
        }
    }
}
