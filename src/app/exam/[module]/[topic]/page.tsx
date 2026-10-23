'use client'

/**
 * Halaman Ujian — gaya Safe Exam Browser (ringan):
 * - Praktikan login (nama + NIM/kelas) lalu masuk fullscreen.
 * - Semua pelanggaran (keluar fullscreen, pindah tab, paste dari luar) tercatat
 *   ke server dan dapat dipantau admin di /admin.
 * - Copy-paste diizinkan; salinan dari modul dicatat sebagai normal.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { MODULES, type ModuleKey } from '@/lib/utils'
import { TOPIC_CONTENT } from '@/lib/topic-content'
import { useExamStore } from '@/lib/store'
import { useExamMonitor } from '@/hooks/useExamMonitor'
import { useCodeRunner } from '@/hooks/useCodeRunner'
import { useCodeEditorStore, useExecutionStore } from '@/lib/store'
import { CodeEditor, LanguageSelector, ThemeSelector } from '@/components/CodeEditor'
import { Console } from '@/components/Console'
import { ArduinoSimulator } from '@/components/ArduinoSimulator'
import { cn } from '@/lib/utils'
import {
  Play, Square, RotateCcw, Terminal, Cpu, BookOpen,
  ShieldCheck, ShieldAlert, Clock, LogOut, AlertTriangle, Eye, EyeOff, DoorOpen, CheckCircle2, Code,
} from 'lucide-react'

const VIOLATION_TEXT: Record<string, string> = {
  keluar_layarpenuh: 'Keluar dari layar penuh saat ujian!',
  pindah_tab: 'Membuka/menyembunyikan tab lain saat ujian!',
  jendela_hilang_fokus: 'Jendela kehilangan fokus',
  copy: 'Teks disalin (diizinkan, tercatat)',
  paste_modul: 'Paste dari modul (diizinkan)',
  paste_luar: 'Paste dari LUAR aplikasi (tercatat sebagai indikasi)',
  reload_halaman: 'Halaman dimuat ulang',
}

const VPASTEL_TEXT = 'Copy-paste diizinkan, tetapi SEMUA peristiwa tercatat. Salinan dari modul adalah normal; paste dari luar aplikasi (mesin pencari/ChatGPT/dokumen) ditandai untuk admin.'

export default function ExamPage() {
  const params = useParams()
  const moduleKey = params.module as ModuleKey
  const topicId = params.topic as string
  const moduleData = MODULES[moduleKey]
  const content = TOPIC_CONTENT[topicId]

  const { participant, session, violations, lastEventDetail } = useExamStore()
  const { startExam, endExam, enterFullscreen } = useExamMonitor()
  const { run, stop, reset } = useCodeRunner()
  const executionRunning = useExecutionStore((s) => s.isRunning)
  const code = useCodeEditorStore((s) => s.code)

  const [showArduino, setShowArduino] = useState(moduleKey === 'arduino')
  const [form, setForm] = useState({ name: '', nim: '', kelas: '' })
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [finished, setFinished] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [toast, setToast] = useState<{ text: string; severity: string } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* sesi aktif di browser ini? (untuk menampilkan modal start atau tidak) */
  const sessionMatches = Boolean(session && session.module === moduleKey && session.topic === topicId)
  /* status fullscreen dilacak via event (bukan dibaca langsung di render, agar hydration aman) */
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenWarned, setFullscreenWarned] = useState(false)

  /* jam hitung maju */
  useEffect(() => {
    if (!session) return
    const started = new Date(session.startedAt).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - started) / 1000))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [session])

  /* status fullscreen + reset flag peringatan ketika kembali fullscreen */
  useEffect(() => {
    const onFs = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
      if (document.fullscreenElement) setFullscreenWarned(false)
    }
    onFs()
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  /* toast untuk setiap kejadian anti-cheat */
  useEffect(() => {
    if (!lastEventDetail) return
    const label = VIOLATION_TEXT[lastEventDetail.type] || lastEventDetail.type
    // setState via timeout agar tidak menjadi cascading render di effect
    const t = setTimeout(() => {
      setToast({ text: label, severity: lastEventDetail.severity })
    }, 0)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3100)
    return () => clearTimeout(t)
  }, [lastEventDetail])

  const handleStart = useCallback(async () => {
    if (!form.name.trim() || !form.nim.trim()) {
      setStartError('Nama dan NIM wajib diisi')
      return
    }
    setStarting(true)
    setStartError(null)
    try {
      await startExam({
        name: form.name,
        nim: form.nim,
        kelas: form.kelas,
        module: moduleKey,
        topic: topicId,
        codeSnapshot: content?.starterCode || '',
      })
    } catch (err) {
      setStartError(err instanceof Error ? err.message : 'Gagal memulai ujian — pastikan server berjalan')
    } finally {
      setStarting(false)
    }
  }, [form, startExam, moduleKey, topicId, content])

  const handleEnd = useCallback(async () => {
    await endExam(code)
    setConfirmEnd(false)
    setFinished(true)
  }, [endExam, code])

  if (!moduleData || !content) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="text-center">
          <ShieldAlert className="w-12 h-12 text-[#FF3333] mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Soal ujian tidak ditemukan</h1>
          <p className="text-gray-400 mb-4">Tidak ada konten untuk modul {moduleKey}/{topicId}.</p>
          <Link href="/learn" className="text-[#0066CC] hover:underline">Kembali ke halaman belajar</Link>
        </div>
      </div>
    )
  }

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  /* ---------- selesai: ringkasan ---------- */
  if (finished) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#161b22] border border-gray-800 rounded-2xl p-8 text-center">
          <CheckCircle2 className="w-14 h-14 text-[#00AA55] mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Sesi Ujian Berakhir</h1>
          <p className="text-gray-400 mb-6">
            Jawabanmu telah disimpan di server. Panitia/admin dapat melihat catatan aktivitas sesi kamu di panel admin.
          </p>
          <div className="text-sm text-gray-400 bg-[#0d1117] rounded-xl p-4 mb-6 space-y-1 text-left">
            <div>Durasi: <span className="text-white">{fmtTime(elapsed)}</span></div>
            <div>Info/kopas normal: <span className="text-white">{violations.info}</span></div>
            <div>Indikasi (kuning): <span className="text-[#FFB800]">{violations.warning}</span></div>
            <div>Pelanggaran (merah): <span className="text-[#FF3333]">{violations.danger}</span></div>
          </div>
          <Link
            href={`/learn/${moduleKey}/${topicId}`}
            className="block w-full py-3 bg-gradient-to-r from-[#0066CC] to-[#00AA55] text-white rounded-xl font-medium"
          >
            Kembali ke mode belajar
          </Link>
        </div>
      </div>
    )
  }

  /* ---------- layar mulai ---------- */
  const showStartScreen = !sessionMatches || !participant

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* ===== Banner ujian ===== */}
      <header className="sticky top-0 z-40 bg-[#161b22]/95 backdrop-blur border-b border-[#FF3333]/40">
        <div className="max-w-full mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ShieldCheck className="w-5 h-5 text-[#00AA55] shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                Mode Ujian — {moduleData.name}: {content.description.split(',')[0]}
              </p>
              {participant && (
                <p className="text-xs text-gray-500 truncate">
                  {participant.name} • NIM {participant.nim} {participant.kelas && `• ${participant.kelas}`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="font-mono text-sm">{fmtTime(elapsed)}</span>
            <span className="px-2 py-0.5 rounded bg-[#0066CC]/20 text-[#0066CC] text-xs flex items-center gap-1">
              <Eye className="w-3 h-3" /> {violations.info}
            </span>
            <span className="px-2 py-0.5 rounded bg-[#FF6B00]/20 text-[#FF6B00] text-xs flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {violations.warning}
            </span>
            <span className="px-2 py-0.5 rounded bg-[#FF3333]/20 text-[#FF3333] text-xs flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> {violations.danger}
            </span>
            <button
              onClick={() => setConfirmEnd(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#FF3333] hover:bg-[#dd2222] text-white text-xs font-medium rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Akhiri Ujian
            </button>
          </div>
        </div>
      </header>

      {/* ===== konten ===== */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 flex min-h-0">
          {/* modul/soal di kiri */}
          <aside className="hidden lg:flex w-80 shrink-0 flex-col border-r border-gray-800 bg-[#0d1117]">
            <div className="p-4 border-b border-gray-800 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#00AA55]" />
              <span className="font-semibold text-sm">Modul / Sumber Jawaban</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
              <p className="text-gray-300">{content.description}</p>
              <div>
                <h3 className="font-semibold text-white text-xs uppercase tracking-wider mb-2">Tujuan Pembelajaran</h3>
                <ul className="space-y-1.5">
                  {content.learningObjectives.map((o, i) => (
                    <li key={i} className="flex gap-2 text-xs text-gray-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00AA55]/50 mt-1.5 shrink-0" />
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-3 bg-[#0066CC]/10 border border-[#0066CC]/30 rounded-lg">
                <p className="text-xs text-[#8ab4e8] leading-relaxed">
                  <strong>Sumber jawaban tersedia di sini.</strong> {VPASTEL_TEXT}
                </p>
              </div>
            </div>
          </aside>

          {/* IDE */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div className="flex items-center justify-between p-3 bg-[#161b22] border-b border-gray-800">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                {moduleKey === 'c' ? <Code className="w-4 h-4 text-gray-400" /> : <Cpu className="w-4 h-4 text-gray-400" />}
                <span>{content.description.slice(0, 60)}</span>
              </div>
              <div className="flex items-center gap-2">
                <LanguageSelector />
                <ThemeSelector />
              </div>
            </div>

            <div className="flex-1 flex min-h-0">
              <div className="flex-1 min-w-0">
                <CodeEditor height="100%" />
              </div>
              <div className="w-96 lg:w-1/3 border-l border-gray-800 flex flex-col bg-[#0d1117]">
                <div className="flex items-center gap-2 p-3 bg-[#161b22] border-b border-gray-800">
                  <button
                    onClick={() => setShowArduino(false)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium',
                      !showArduino ? 'bg-[#0066CC] text-white' : 'bg-gray-800/60 text-gray-300'
                    )}
                  >
                    <Terminal className="w-4 h-4 mr-1 inline" />
                    Konsol
                  </button>
                  {moduleKey === 'arduino' && (
                    <button
                      onClick={() => setShowArduino(true)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium',
                        showArduino ? 'bg-[#00AA55] text-white' : 'bg-gray-800/60 text-gray-300'
                      )}
                    >
                      <Cpu className="w-4 h-4 mr-1 inline" />
                      Arduino
                    </button>
                  )}
                </div>
                <div className="flex-1 min-h-0">
                  {showArduino && moduleKey === 'arduino' ? <ArduinoSimulator /> : <Console />}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* tombol aksi */}
        <div className="border-t border-gray-800 bg-[#161b22] px-4 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => void run()}
              disabled={executionRunning}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0066CC] to-[#00AA55] text-white rounded-xl text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              Jalankan (Ctrl+Enter)
            </button>
            <button onClick={stop} className="flex items-center gap-2 px-4 py-2.5 bg-[#FF3333]/20 text-[#FF3333] rounded-xl text-sm font-medium">
              <Square className="w-4 h-4" />
              Berhenti
            </button>
            <button
              onClick={() => reset(content.starterCode)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-800/60 text-gray-300 rounded-xl text-sm font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <EyeOff className="w-3.5 h-3.5" />
            Copy-paste diizinkan — seluruh aktivitas tercatat untuk admin
          </div>
        </div>
      </main>

      {/* toast pelanggaran */}
      {toast && (
        <div
          className={cn(
            'fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl border text-sm font-medium shadow-xl animate-pulse',
            toast.severity === 'danger' && 'bg-[#FF3333]/95 text-white border-[#FF3333]',
            toast.severity === 'warning' && 'bg-[#FFB800]/95 text-black border-[#FFB800]',
            toast.severity === 'info' && 'bg-[#161b22] text-gray-200 border-gray-700'
          )}
        >
          {toast.severity !== 'info' && <AlertTriangle className="inline w-4 h-4 mr-1.5 -mt-0.5" />}
          {toast.text}
        </div>
      )}

      {/* overlay keluar fullscreen */}
      {sessionMatches && !isFullscreen && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-6">
          <div className="max-w-sm w-full bg-[#161b22] border border-[#FF3333] rounded-2xl p-6 text-center">
            <ShieldAlert className="w-12 h-12 text-[#FF3333] mx-auto mb-3" />
            <h2 className="text-lg font-bold mb-1">{fullscreenWarned ? 'Keluar layar penuh lagi?' : 'Layar penuh keluar!'}</h2>
            <p className="text-sm text-gray-400 mb-4">
              Ujian dirancang berjalan dalam mode layar penuh. Tindakan ini tercatat di panel admin.
            </p>
            <button
              onClick={() => { setFullscreenWarned(true); enterFullscreen() }}
              className="w-full py-2.5 bg-[#0066CC] hover:bg-[#0055aa] text-white rounded-xl font-medium"
            >
              Kembali ke layar penuh
            </button>
          </div>
        </div>
      )}

      {/* dialog akhiri ujian */}
      {confirmEnd && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-6">
          <div className="max-w-sm w-full bg-[#161b22] border border-gray-700 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
              <DoorOpen className="w-5 h-5 text-[#FF6B00]" />
              Akhiri sesi ujian?
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Sesi akan ditutup, layar penuh dilepas, dan catatan aktivitas dikirim ke admin.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmEnd(false)}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm font-medium"
              >
                Batal, Lanjut Ujian
              </button>
              <button
                onClick={() => void handleEnd()}
                className="flex-1 py-2.5 bg-[#FF3333] hover:bg-[#dd2222] text-white rounded-xl text-sm font-medium"
              >
                Ya, Akhiri
              </button>
            </div>
          </div>
        </div>
      )}

      {/* layar start (login) */}
      {showStartScreen && (
        <div className="fixed inset-0 z-[80] bg-gray-950/95 backdrop-blur flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#161b22] border border-gray-700 rounded-2xl p-8">
            <div className="text-center mb-6">
              <ShieldCheck className="w-12 h-12 text-[#00AA55] mx-auto mb-3" />
              <h1 className="text-xl font-bold">Mulai Sesi Pengerjaan</h1>
              <p className="text-sm text-gray-400 mt-1">
                {moduleData.name} — {topicId}
              </p>
            </div>
            {/* disclaimer anti-cheat */}
            <div className="mb-4 p-3 bg-[#FF3333]/10 border border-[#FF3333]/40 rounded-xl text-xs text-gray-300 leading-relaxed">
              <p className="font-semibold text-[#FF8888] mb-1">Aturan Anti-Cheat (mode Safe Exam Browser):</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Jawab dalam mode layar penuh — keluar layar penuh/pindah tab tercatat.</li>
                <li>Copy-paste diizinkan; salinan modul normal, salinan luar ditandai.</li>
                <li>Admin memantau seluruh kegiatan selama sesi berlangsung.</li>
              </ul>
            </div>
            <div className="space-y-3">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nama lengkap"
                className="w-full bg-[#0d1117] border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
              />
              <input
                value={form.nim}
                onChange={(e) => setForm({ ...form, nim: e.target.value })}
                placeholder="NIM"
                className="w-full bg-[#0d1117] border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
              />
              <input
                value={form.kelas}
                onChange={(e) => setForm({ ...form, kelas: e.target.value })}
                placeholder="Kelas (opsional)"
                className="w-full bg-[#0d1117] border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
              />
              {startError && <p className="text-xs text-[#FF3333]">{startError}</p>}
              <button
                onClick={() => void handleStart()}
                disabled={starting}
                className="w-full py-3 bg-gradient-to-r from-[#0066CC] to-[#00AA55] text-white rounded-xl font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {starting ? 'Menghubungkan…' : 'Masuk Layar Penuh & Mulai'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
