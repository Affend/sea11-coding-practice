/**
 * Klien API sistem ujian & anti-cheat (di browser).
 * - login / mulai / akhiri sesi
 * - kirim batch event (fetch biasa + navigator.sendBeacon saat unload)
 * - pelacak "clipboard internal": copy di dalam aplikasi dicatat, dan dipakai
 * - pelacak "clipboard internal": copy di dalam aplikasi dicatat, dan dipakai
 *   untuk membedakan paste dari modul (diizinkan) vs dari luar aplikasi (dicatat sebagai indikasi).
 */
export interface ExamParticipantDTO {
  id: number
  name: string
  nim: string
  kelas: string
}

export interface SessionDTO {
  id: number
  participant_id: number
  module: string
  topic: string
  started_at: string
  status: string
}

export interface ExamEventDraft {
  type: string
  severity?: 'info' | 'warning' | 'danger'
  detail?: string
  at?: string
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`)
  return data as T
}

export function loginParticipant(name: string, nim: string, kelas: string) {
  return jsonFetch<ExamParticipantDTO>('/api/exam/login', {
    method: 'POST',
    body: JSON.stringify({ name, nim, kelas }),
  })
}

export function startExamSession(participantId: number, module: string, topic: string, codeSnapshot = '') {
  return jsonFetch<SessionDTO>('/api/exam/start', {
    method: 'POST',
    body: JSON.stringify({ participantId, module, topic, codeSnapshot }),
  })
}

export function sendExamEvents(sessionId: number, events: ExamEventDraft[]) {
  return jsonFetch<{ inserted: number }>('/api/exam/events', {
    method: 'POST',
    body: JSON.stringify({ sessionId, events }),
  })
}

export function endExamSession(sessionId: number, events: ExamEventDraft[], codeSnapshot?: string) {
  return jsonFetch<{ ok: boolean }>('/api/exam/end', {
    method: 'POST',
    body: JSON.stringify({ sessionId, events, codeSnapshot }),
  })
}

/** Kirim dengan sendBeacon — dipakai saat beforeunload karena fetch tidak pasti selesai. */
export function beaconExamEvents(sessionId: number, events: ExamEventDraft[]) {
  if (!sessionId || typeof navigator === 'undefined' || !navigator.sendBeacon) return false
  const blob = new Blob([JSON.stringify({ sessionId, events })], { type: 'application/json' })
  return navigator.sendBeacon('/api/exam/events', blob)
}

/**
 * Tracker clipboard internal.
 * Menangkap copy/paste pada level dokumen (capture) agar tidak terhalang
 * handler Monaco/jalur transisi React, lalu menyimpan teks terakhir yang
 * dikopi DI DALAM aplikasi.
 */
export class InternalClipboardTracker {
  private lastInternalCopy = { text: '', at: 0 }

  /** Panggil dari listener `copy` dokumen. Simpan teks yang dikopi internal. */
  registerCopy(text: string | undefined | null) {
    if (!text) return
    this.lastInternalCopy = { text, at: Date.now() }
  }

  /** Panggil dari listener `paste` dokumen. True bila teks cocok dengan hasil copy internal. */
  isFromInternal(pastedText: string | undefined | null): boolean {
    if (!pastedText) return false
    const { text, at } = this.lastInternalCopy
    if (!text) return false
    // paste <= 5 menit setelah copy internal dianggap dari modul
    if (Date.now() - at > 5 * 60 * 1000) return false
    return pastedText === text || (text.length > 30 && pastedText.includes(text))
  }
}
