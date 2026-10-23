/**
 * Database layer — server-side only.
 * SQLite (better-sqlite3), berkas tersimpan di <project>/data/sea11.db
 * Jalankan dari server LAN: praktikan & admin mengakses via HTTP API berikut.
 */
import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'sea11.db')

declare global {
  var __sea11Db: Database.Database | undefined
}

function getDb(): Database.Database {
  if (!global.__sea11Db) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    const db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.exec(`
      CREATE TABLE IF NOT EXISTS participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        nim TEXT NOT NULL UNIQUE,
        kelas TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS exam_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        participant_id INTEGER NOT NULL REFERENCES participants(id),
        module TEXT NOT NULL,
        topic TEXT NOT NULL,
        code_snapshot TEXT NOT NULL DEFAULT '',
        started_at TEXT NOT NULL,
        ended_at TEXT,
        status TEXT NOT NULL DEFAULT 'aktif'
      );

      CREATE TABLE IF NOT EXISTS exam_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL REFERENCES exam_sessions(id),
        type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'info',
        detail TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_participant ON exam_sessions(participant_id);
      CREATE INDEX IF NOT EXISTS idx_events_session ON exam_events(session_id);
    `)
    global.__sea11Db = db
  }
  return global.__sea11Db
}

export interface ParticipantRow {
  id: number
  name: string
  nim: string
  kelas: string
}

export interface SessionRow {
  id: number
  participant_id: number
  module: string
  topic: string
  code_snapshot: string
  started_at: string
  ended_at: string | null
  status: string
}

export interface EventRow {
  id: number
  session_id: number
  type: string
  severity: string
  detail: string
  created_at: string
}

function now() {
  return new Date().toISOString()
}

export function upsertParticipant(name: string, nim: string, kelas: string): ParticipantRow {
  const db = getDb()
  return db
    .prepare(
      `INSERT INTO participants (name, nim, kelas, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(nim) DO UPDATE SET name = excluded.name, kelas = excluded.kelas, updated_at = excluded.updated_at
       RETURNING id, name, nim, kelas`
    )
    .get(name.trim(), nim.trim(), kelas.trim(), now(), now()) as ParticipantRow
}

export function getParticipant(id: number): ParticipantRow | undefined {
  const db = getDb()
  return db.prepare('SELECT id, name, nim, kelas FROM participants WHERE id = ?').get(id) as
    | ParticipantRow
    | undefined
}

/** Menutup semua sesi 'aktif' milik partisipan (dipanggil saat mulai sesi baru). */
export function closeStaleSessions(participantId: number) {
  const db = getDb()
  db.prepare(
    `UPDATE exam_sessions SET status = 'terlupakan', ended_at = ? WHERE participant_id = ? AND status = 'aktif'`
  ).run(now(), participantId)
}

export function createSession(
  participantId: number,
  module: string,
  topic: string,
  codeSnapshot = ''
): SessionRow {
  const db = getDb()
  closeStaleSessions(participantId)
  return db
    .prepare(
      `INSERT INTO exam_sessions (participant_id, module, topic, code_snapshot, started_at, status)
       VALUES (?, ?, ?, ?, ?, 'aktif') RETURNING *`
    )
    .get(participantId, module, topic, codeSnapshot.slice(0, 200_000), now()) as SessionRow
}

export function insertEvents(sessionId: number, events: IncomingExamEvent[]): number {
  const db = getDb()
  const info = db.transaction((list: IncomingExamEvent[]) => {
    const stmt = db.prepare(
      `INSERT INTO exam_events (session_id, type, severity, detail, created_at) VALUES (?, ?, ?, ?, ?)`
    )
    let count = 0
    for (const ev of list) {
      stmt.run(sessionId, String(ev.type || 'unknown'), normalizeSeverity(ev.severity), String(ev.detail ?? '').slice(0, 2000), ev.at || now())
      count++
    }
    return count
  })
  return info(events || [])
}

export function endSession(sessionId: number, events: IncomingExamEvent[] = [], codeSnapshot?: string): boolean {
  const db = getDb()
  if (events.length) insertEvents(sessionId, events)
  const stmt = codeSnapshot
    ? db.prepare(
        `UPDATE exam_sessions SET status = 'selesai', ended_at = ?, code_snapshot = ? WHERE id = ? AND status = 'aktif'`
      )
    : db.prepare(`UPDATE exam_sessions SET status = 'selesai', ended_at = ? WHERE id = ? AND status = 'aktif'`)
  const res = codeSnapshot ? stmt.run(now(), codeSnapshot.slice(0, 200_000), sessionId) : stmt.run(now(), sessionId)
  return res.changes > 0
}

export function getSession(id: number): SessionRow | undefined {
  const db = getDb()
  return db.prepare('SELECT * FROM exam_sessions WHERE id = ?').get(id) as SessionRow | undefined
}

export interface IncomingExamEvent {
  type: string
  severity?: string
  detail?: string
  at?: string
}

function normalizeSeverity(sev?: string): string {
  return ['info', 'warning', 'danger'].includes(sev || '') ? (sev as string) : 'info'
}

export interface AdminSessionSummary extends SessionRow {
  name: string
  nim: string
  kelas: string
  info_count: number
  warning_count: number
  danger_count: number
}

export function listSessions(limit = 200): AdminSessionSummary[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT s.*, p.name, p.nim, p.kelas,
        (SELECT COUNT(*) FROM exam_events e WHERE e.session_id = s.id AND e.severity = 'info') AS info_count,
        (SELECT COUNT(*) FROM exam_events e WHERE e.session_id = s.id AND e.severity = 'warning') AS warning_count,
        (SELECT COUNT(*) FROM exam_events e WHERE e.session_id = s.id AND e.severity = 'danger') AS danger_count
       FROM exam_sessions s JOIN participants p ON p.id = s.participant_id
       ORDER BY s.started_at DESC LIMIT ?`
    )
    .all(limit) as AdminSessionSummary[]
}

export function getSessionEvents(sessionId: number): EventRow[] {
  const db = getDb()
  return db
    .prepare(`SELECT * FROM exam_events WHERE session_id = ? ORDER BY id ASC`)
    .all(sessionId) as EventRow[]
}

export function getSessionWithParticipant(sessionId: number): (SessionRow & ParticipantRow) | undefined {
  const db = getDb()
  return db
    .prepare(
      `SELECT s.*, p.name, p.nim, p.kelas FROM exam_sessions s JOIN participants p ON p.id = s.participant_id WHERE s.id = ?`
    )
    .get(sessionId) as (SessionRow & ParticipantRow) | undefined
}

/** Evaluasi "nilai kecurangan" sebuah sesi: 0 aman, 1 waspada, 2 diduga curang. */
export function sessionRiskLevel(s: AdminSessionSummary): 0 | 1 | 2 {
  const danger = s.danger_count
  const warning = s.warning_count
  if (danger >= 3 || warning >= 10) return 2
  if (danger >= 1 || warning >= 4) return 1
  return 0
}

/** Verifikasi kunci admin. Password dari env ADMIN_PASSWORD, default untuk uji coba lokal. */
export function verifyAdminKey(key: string | null | undefined): boolean {
  const expected = process.env.ADMIN_PASSWORD || 'sea11-admin'
  if (!key) return false
  const a = Buffer.from(key)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export function isExamEventTableReady(): boolean {
  return fs.existsSync(DB_PATH)
}
