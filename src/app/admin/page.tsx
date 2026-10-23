'use client'

/**
 * Panel Admin — memantau status anti-cheat seluruh praktikan.
 * Password default: "sea11-admin" (ubah via env ADMIN_PASSWORD di server).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  ShieldCheck, ShieldAlert, Lock, LogOut, RefreshCw, Download,
  Eye, AlertTriangle, User, Clock, ChevronDown, ChevronRight, MonitorPlay,
} from 'lucide-react'

interface SessionSummary {
  id: number
  name: string
  nim: string
  kelas: string
  module: string
  topic: string
  started_at: string
  ended_at: string | null
  status: string
  info_count: number
  warning_count: number
  danger_count: number
  risk: 0 | 1 | 2
}

interface SessionDetail {
  session: SessionSummary
  events: { id: number; type: string; severity: string; detail: string; created_at: string }[]
  counts: { info: number; warning: number; danger: number }
}

const RISK_META = {
  0: { label: 'Aman', cls: 'bg-[#00AA55]/20 text-[#00AA55]' },
  1: { label: 'Waspada', cls: 'bg-[#FFB800]/20 text-[#FFB800]' },
  2: { label: 'Diduga Curang', cls: 'bg-[#FF3333]/20 text-[#FF3333]' },
}

const TYPE_LABEL: Record<string, string> = {
  keluar_layarpenuh: 'Keluar layar penuh',
  pindah_tab: 'Pindah/sembunyikan tab',
  jendela_hilang_fokus: 'Jendela kehilangan fokus',
  copy: 'Copy teks',
  paste_modul: 'Paste dari modul',
  paste_luar: 'Paste dari luar aplikasi',
  reload_halaman: 'Reload halaman',
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [detail, setDetail] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadSessions = useCallback(async (key: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/sessions', { headers: { 'x-admin-key': key } })
      if (res.status === 401) {
        setAuthed(false)
        setAuthError('Password admin salah')
        return
      }
      const data = await res.json()
      setSessions(data.sessions || [])
      setAuthed(true)
      setAuthError(null)
    } catch {
      setAuthError('Server tidak merespons — jalankan `npm run dev` dulu')
    } finally {
      setLoading(false)
    }
  }, [])

  /* persist password via sessionStorage supaya refresh tidak login ulang */
  useEffect(() => {
    const saved = sessionStorage.getItem('sea11-admin-key')
    if (saved) {
      // semua setState/async via timeout agar tidak cascading render di effect
      const t = setTimeout(() => {
        setAdminKey(saved)
        void loadSessions(saved)
      }, 0)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* auto refresh */
  useEffect(() => {
    if (authed && autoRefresh && adminKey) {
      timerRef.current = setInterval(() => void loadSessions(adminKey), 5000)
      return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }
  }, [authed, autoRefresh, adminKey, loadSessions])

  const handleLogin = () => {
    sessionStorage.setItem('sea11-admin-key', adminKey)
    void loadSessions(adminKey)
  }

  const openDetail = async (id: number) => {
    if (expanded === id) { setExpanded(null); setDetail(null); return }
    setExpanded(id)
    setDetail(null)
    try {
      const res = await fetch(`/api/admin/sessions/${id}`, { headers: { 'x-admin-key': adminKey } })
      const data = await res.json()
      setDetail(data)
    } catch { /* diamkan — baris detail tetap kosong */ }
  }

  const exportCsv = () => {
    const header = ['id', 'nama', 'nim', 'kelas', 'modul', 'topik', 'mulai', 'berakhir', 'status', 'info', 'warning', 'danger', 'risiko']
    const rows = sessions.map((s) => [
      s.id, s.name, s.nim, s.kelas, s.module, s.topic, s.started_at, s.ended_at || '', s.status,
      s.info_count, s.warning_count, s.danger_count, RISK_META[s.risk].label,
    ])
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `laporan-ujian-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  /* ---------- layar login admin ---------- */
  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-[#161b22] border border-gray-700 rounded-2xl p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#FF3333]/15 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-7 h-7 text-[#FF3333]" />
            </div>
            <h1 className="text-xl font-bold">Panel Admin Anti-Cheat</h1>
            <p className="text-xs text-gray-500 mt-1">Laboratorium SEA — Divisi Riset</p>
          </div>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Password admin"
            className="w-full bg-[#0d1117] border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
          />
          {authError && <p className="text-xs text-[#FF3333] mt-2 text-center">{authError}</p>}
          <button
            onClick={handleLogin}
            className="w-full mt-4 py-3 bg-[#0066CC] hover:bg-[#005599] text-white rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" /> Masuk Panel
          </button>
          <p className="text-[10px] text-gray-600 mt-3 text-center">
            Password default: <code className="text-gray-400">sea11-admin</code>. Ubah via env <code className="text-gray-400">ADMIN_PASSWORD</code> di server.
          </p>
          <Link href="/learn" className="block text-center text-xs text-gray-500 hover:text-gray-300 mt-4">
            ← Kembali ke aplikasi
          </Link>
        </div>
      </div>
    )
  }

  /* ---------- tabel sesi ---------- */
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-40 bg-[#161b22]/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MonitorPlay className="w-5 h-5 text-[#00AA55]" />
            <span className="font-semibold">Panel Anti-Cheat — Sesi Ujian</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh((v) => !v)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5',
                autoRefresh ? 'bg-[#00AA55]/20 text-[#00AA55]' : 'bg-gray-800 text-gray-400'
              )}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', autoRefresh && 'animate-spin')} />
              Auto 5 dtk
            </button>
            <button
              onClick={exportCsv}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-gray-300 flex items-center gap-1.5 hover:bg-gray-700"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              onClick={() => { sessionStorage.removeItem('sea11-admin-key'); setAuthed(false); setAdminKey('') }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#FF3333]/20 text-[#FF3333] flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-4 flex items-center justify-between text-sm">
          <div className="text-gray-400 flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#00AA55]" />
            {sessions.length} sesi tercatat {loading && <span className="text-gray-600">(memuat…)</span>}
          </div>
          <div className="text-xs text-gray-500">
            Merah = pelanggaran keras (keluar layar penuh/pindah tab) • Kuning = indikasi (paste luar) • Hijau = aman
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Belum ada sesi ujian. Praktikan memulai dari <code className="text-gray-300">/exam/…</code></p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="bg-[#161b22] border border-gray-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => void openDetail(s.id)}
                  className="w-full text-left p-4 grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center hover:bg-[#1c2330] transition-colors"
                >
                  {expanded === s.id ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{s.name}</span>
                      <span className="text-xs text-gray-500">{s.nim} {s.kelas && `• ${s.kelas}`}</span>
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', RISK_META[s.risk].cls)}>
                        {RISK_META[s.risk].label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {s.module}/{s.topic} • mulai {new Date(s.started_at).toLocaleString('id-ID')} • {s.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-400">{s.info_count} info</span>
                    <span className={cn('px-2 py-0.5 rounded', s.warning_count ? 'bg-[#FFB800]/15 text-[#FFB800]' : 'bg-gray-800 text-gray-500')}>
                      {s.warning_count} kuning
                    </span>
                    <span className={cn('px-2 py-0.5 rounded', s.danger_count ? 'bg-[#FF3333]/15 text-[#FF3333]' : 'bg-gray-800 text-gray-500')}>
                      {s.danger_count} merah
                    </span>
                  </div>
                  <Clock className="w-4 h-4 text-gray-600" />
                </button>

                {expanded === s.id && (
                  <div className="border-t border-gray-800 p-4 bg-[#0d1117]">
                    {!detail ? (
                      <p className="text-sm text-gray-500">Memuat detail…</p>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {detail.events.length === 0 && (
                          <p className="text-sm text-gray-500 text-center py-4">Tidak ada kejadian tercatat.</p>
                        )}
                        {detail.events.map((ev) => (
                          <div
                            key={ev.id}
                            className={cn(
                              'flex items-start gap-3 px-3 py-2 rounded-lg border-l-4 bg-[#161b22]',
                              ev.severity === 'danger' && 'border-l-[#FF3333]',
                              ev.severity === 'warning' && 'border-l-[#FFB800]',
                              ev.severity === 'info' && 'border-l-gray-600'
                            )}
                          >
                            <span className="text-[10px] text-gray-500 font-mono shrink-0 mt-0.5">
                              {new Date(ev.created_at).toLocaleTimeString('id-ID')}
                            </span>
                            <div className="min-w-0">
                              <p className={cn(
                                'text-xs font-medium flex items-center gap-1.5',
                                ev.severity === 'danger' ? 'text-[#FF8888]' : ev.severity === 'warning' ? 'text-[#FFB800]' : 'text-gray-300'
                              )}>
                                {ev.severity === 'danger' ? <AlertTriangle className="w-3 h-3" /> : <User className="w-3 h-3 opacity-50" />}
                                {TYPE_LABEL[ev.type] || ev.type}
                              </p>
                              {ev.detail && <p className="text-xs text-gray-500 break-all">{ev.detail}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
