'use client'

/**
 * useExamMonitor — pemantau ujian mode Safe Exam Browser (ringan). Fitur:
 * 1. Kunci layar penuh saat mulai ujian; keluar layar penuh = pelanggaran 'danger'
 *    + mencoba kembali untuk masuk layar penuh.
 * 2. Deteksi pindah tab / minimalkan jendela = pelanggaran 'danger'.
 * 3. Copy dan paste diizinkan, tetapi semua aktivitas dicatat; asal salinan
 *    dicocokan dengan clipboard internal — paste dari luar aplikasi = 'warning'.
 * 4. Kirim batch event ke server setiap 5 detik, kecuali saat 'beforeunload' memakai
 *    navigator.sendBeacon.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  loginParticipant,
  startExamSession,
  sendExamEvents,
  endExamSession,
  beaconExamEvents,
  InternalClipboardTracker,
  type ExamEventDraft,
} from '@/lib/exam-client'
import { useExamStore } from '@/lib/store'

const FLUSH_INTERVAL_MS = 5000
const DUPLICATE_SUPPRESS_MS = 2000

export type ExamSeverity = 'info' | 'warning' | 'danger'

export interface StartExamArgs {
  name: string
  nim: string
  kelas: string
  module: string
  topic: string
  codeSnapshot?: string
}

export function useExamMonitor() {
  const { participant, session, startSession, clearSession, setParticipant } = useExamStore()

  const queueRef = useRef<ExamEventDraft[]>([])
  const lastEventAtRef = useRef<Record<string, number>>({})
  const internalClipboardRef = useRef(new InternalClipboardTracker())
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const flushRef = useRef<() => Promise<void>>(async () => {})
  const [isMonitorActive, setIsMonitorActive] = useState(
    Boolean(session && participant)
  )

  /** Catat 1 event (severity + type + detail). Antrian, kirim belakangan. */
  const logEvent = useCallback((severity: ExamSeverity, type: string, detail = '', dedupeKey?: string) => {
    const key = dedupeKey || type
    const now = Date.now()
    if (now - (lastEventAtRef.current[key] || 0) < DUPLICATE_SUPPRESS_MS) return
    lastEventAtRef.current[key] = now

    const ev: ExamEventDraft = { type, severity, detail: detail.slice(0, 500), at: new Date().toISOString() }
    queueRef.current.push(ev)
    useExamStore.getState().recordViolation(severity, type)

    // kirim lebih awal bila batch besar agar tunggakan tidak menumpuk
    if (queueRef.current.length >= 25) void flushRef.current()
  }, [])

  // `flush` membaca store langsung (bukan state render) sehingga tidak stale
  const flush = useCallback(async () => {
    const stash = queueRef.current
    queueRef.current = []
    if (!stash.length) return
    const sid = useExamStore.getState().session?.sessionId
    if (!sid) {
      // tidak ada sesi aktif — buang antrean
      return
    }
    try {
      await sendExamEvents(sid, stash)
    } catch {
      // gagal kirim: kembalikan ke antrean agar dicoba di flush berikutnya
      queueRef.current = [...stash, ...queueRef.current].slice(-300)
    }
  }, [])
  // tetapkan sekali via effect agar ref tidak diketuk saat render
  useEffect(() => {
    flushRef.current = flush
  }, [flush])

  /* ---------- Fullscreen ---------- */
  const requestedFullscreenRef = useRef(false)

  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen()
      requestedFullscreenRef.current = true
    } catch {
      // browser bisa menolak tanpa user gesture; tercatat di fullscreenchange
    }
  }, [])

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
    requestedFullscreenRef.current = false
  }, [])

  /* ---------- Monitoring listeners ---------- */
  useEffect(() => {
    if (!session || !participant || !isMonitorActive) return

    const sid = session.sessionId

    const onFullscreenChange = () => {
      if (!document.fullscreenElement && requestedFullscreenRef.current) {
        logEvent('danger', 'keluar_layarpenuh', 'Praktikan keluar dari mode layar penuh saat ujian berlangsung')
        // ya tidak; coba lagi masuk fullscreen — aaa browser kadang memerlukan gesture
        document.documentElement.requestFullscreen().catch(() => {})
      }
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        logEvent('danger', 'pindah_tab', 'Ujian kehilangan fokus (tab disembunyikan / minimalkan)')

        // Ketika tab tersembunyi requestFullscreen akan gagal — maka ketika kembali
        // fullscreen change akan di-trigger oleh listener di atas.
      }
    }

    const onWindowBlur = () => {
      logEvent('warning', 'jendela_hilang_fokus', 'Jendela browser kehilangan fokus', 'jendela-fokus')
    }

    const onCopy = () => {
      const selection = window.getSelection()?.toString() || ''
      internalClipboardRef.current.registerCopy(selection || '')
      logEvent(
        'info',
        'copy',
        selection ? `Menyalin teks ${selection.length} karakter dari dalam aplikasi` : 'Menyalin (kosong)',
        'copy'
      )
    }

    const onPaste = (e: ClipboardEvent) => {
      const pasted = e.clipboardData?.getData('text/plain') || ''
      if (!pasted) return
      const internal = internalClipboardRef.current.isFromInternal(pasted)
      logEvent(
        internal ? 'info' : 'warning',
        internal ? 'paste_modul' : 'paste_luar',
        internal
          ? `Paste ${pasted.length} karakter dari modul (diizinkan)`
          : `Paste ${pasted.length} karakter dari LUAR aplikasi (indikasi jawaban dari sumber lain) - pratinjau: ${pasted.slice(0, 80)}`,
        'paste'
      )
    }

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      beaconExamEvents(sid, queueRef.current)
      queueRef.current = []
      // memicu dialog konfirmasi bawaan browser sebelum menutup tab
      e.preventDefault()
      e.returnValue = ''
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('blur', onWindowBlur)
    document.addEventListener('copy', onCopy, true)
    document.addEventListener('paste', onPaste, true)
    window.addEventListener('beforeunload', onBeforeUnload)

    flushTimerRef.current = setInterval(() => void flush(), FLUSH_INTERVAL_MS)

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('blur', onWindowBlur)
      document.removeEventListener('copy', onCopy, true)
      document.removeEventListener('paste', onPaste, true)
      window.removeEventListener('beforeunload', onBeforeUnload)
      if (flushTimerRef.current) clearInterval(flushTimerRef.current)
    }
  }, [session, participant, isMonitorActive, flush, logEvent])

  /* ---------- Aksi mulai / akhiri ujian ---------- */
  const startExam = useCallback(
    async (args: StartExamArgs) => {
      const p = await loginParticipant(args.name, args.nim, args.kelas)
      setParticipant({ id: p.id, name: p.name, nim: p.nim, kelas: p.kelas })
      const active = await startExamSession(p.id, args.module, args.topic, args.codeSnapshot || '')
      startSession({
        sessionId: active.id,
        module: args.module,
        topic: args.topic,
        startedAt: active.started_at,
      })
      document.documentElement.requestFullscreen().catch(() => {})
      setIsMonitorActive(true)
      return active
    },
    [setParticipant, startSession]
  )

  const endExam = useCallback(
    async (codeSnapshot?: string) => {
      const sid = useExamStore.getState().session?.sessionId
      setIsMonitorActive(false)
      if (sid) {
        const stash = queueRef.current
        queueRef.current = []
        try {
          await endExamSession(sid, stash, codeSnapshot)
        } catch {
          beaconExamEvents(sid, stash)
        }
      }
      exitFullscreen()
      clearSession()
    },
    [exitFullscreen, clearSession]
  )

  /** Setelah refresh halaman saat sesi aktif: pasang kembali pemantauan. */
  useEffect(() => {
    if (session && participant && !isMonitorActive) {
      document.documentElement.requestFullscreen().catch(() => {})
      // setState via timeout agar lint tidak menandai cascading render
      const t = setTimeout(() => setIsMonitorActive(true), 0)
      logEvent('info', 'reload_halaman', 'Halaman dimuat ulang saat sesi ujian aktif (sesi dilanjutkan)')
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isActive = Boolean(session && participant && isMonitorActive)

  return { startExam, endExam, isActive, enterFullscreen, exitFullscreen }
}
