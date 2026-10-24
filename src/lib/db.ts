/**
 * Database layer — server-side only.
 * Client SQLite via @libsql/client dengan DUA mode:
 *   1. LAN (default): berkas lokal <project>/data/sea11.db  → url `file:...`
 *   2. Vercel/cloud: set env `TURSO_DATABASE_URL` (libsql://...) +
 *      `TURSO_AUTH_TOKEN` → DB di Turso (SQLite cloud gratis).
 *
 * Semua fungsi data bersifat async (libsql client berbasis network/async).
 */
import { createClient, type Client, type Row } from '@libsql/client'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import crypto from 'node:crypto'

const DATA_DIR = path.join(process.cwd(), 'data')
const LOCAL_DB_PATH = path.join(DATA_DIR, 'sea11.db')

declare global {
  var __sea11Client: Client | undefined
  var __sea11Init: Promise<void> | undefined
}

const SCHEMA = `
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
`

function createDbClient(): Client {
  const url = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN
  if (url) {
    return createClient({ url, authToken })
  }
  // mode LAN: SQLite berkas lokal
  const fileUrl = pathToFileURL(LOCAL_DB_PATH).href
  return createClient({ url: fileUrl })
}

async function getDb(): Promise<Client> {
  if (!global.__sea11Init) {
    global.__sea11Init = (async () => {
      if (!global.__sea11Client) global.__sea11Client = createDbClient()
      await global.__sea11Client.executeMultiple(SCHEMA)
    })()
  }
  await global.__sea11Init
  return global.__sea11Client as Client
}

/** Ubah hasil query libsql jadi array objek bertipe (key = nama kolom). */
function mapRows<T>(columns: string[], rows: Row[]): T[] {
  return rows.map((row) =>
    Object.fromEntries(columns.map((c, i) => [c, row[i] as unknown])) as T
  )
}

/** libsql bisa mengembalikan integer besar sebagai bigint — normalisasi ke number. */
function toNumber(v: unknown): number {
  return typeof v === 'bigint' ? Number(v) : (v as number)
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

export async function upsertParticipant(name: string, nim: string, kelas: string): Promise<ParticipantRow> {
  const db = await getDb()
  const res = await db.execute({
    sql: `INSERT INTO participants (name, nim, kelas, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(nim) DO UPDATE SET name = excluded.name, kelas = excluded.kelas, updated_at = excluded.updated_at
          RETURNING id, name, nim, kelas`,
    args: [name.trim(), nim.trim(), kelas.trim(), now(), now()],
  })
  return mapRows<ParticipantRow>(res.columns, res.rows)[0]
}

export async function getParticipant(id: number): Promise<ParticipantRow | undefined> {
  const db = await getDb()
  const res = await db.execute({
    sql: 'SELECT id, name, nim, kelas FROM participants WHERE id = ?',
    args: [id],
  })
  return mapRows<ParticipantRow>(res.columns, res.rows)[0]
}

/** Menutup semua sesi 'aktif' milik partisipan (dipanggil saat mulai sesi baru). */
async function closeStaleSessions(db: Client, participantId: number) {
  await db.execute({
    sql: `UPDATE exam_sessions SET status = 'terlupakan', ended_at = ? WHERE participant_id = ? AND status = 'aktif'`,
    args: [now(), participantId],
  })
}

export async function createSession(
  participantId: number,
  module: string,
  topic: string,
  codeSnapshot = ''
): Promise<SessionRow> {
  const db = await getDb()
  await closeStaleSessions(db, participantId)
  const res = await db.execute({
    sql: `INSERT INTO exam_sessions (participant_id, module, topic, code_snapshot, started_at, status)
          VALUES (?, ?, ?, ?, ?, 'aktif') RETURNING *`,
    args: [participantId, module, topic, codeSnapshot.slice(0, 200_000), now()],
  })
  return mapRows<SessionRow>(res.columns, res.rows)[0]
}

export async function insertEvents(sessionId: number, events: IncomingExamEvent[]): Promise<number> {
  const db = await getDb()
  const list = events || []
  // 1 statement per event, dikirim dalam satu batch (transaksi atomik)
  const stmts = list.map((ev) => ({
    sql: `INSERT INTO exam_events (session_id, type, severity, detail, created_at) VALUES (?, ?, ?, ?, ?)`,
    args: [
      sessionId,
      String(ev.type || 'unknown'),
      normalizeSeverity(ev.severity),
      String(ev.detail ?? '').slice(0, 2000),
      ev.at || now(),
    ],
  }))
  if (stmts.length) await db.batch(stmts, 'write')
  return stmts.length
}

export async function endSession(sessionId: number, events: IncomingExamEvent[] = [], codeSnapshot?: string): Promise<boolean> {
  const db = await getDb()
  if (events.length) await insertEvents(sessionId, events)
  const res =
    codeSnapshot !== undefined
      ? await db.execute({
          sql: `UPDATE exam_sessions SET status = 'selesai', ended_at = ?, code_snapshot = ? WHERE id = ? AND status = 'aktif'`,
          args: [now(), codeSnapshot.slice(0, 200_000), sessionId],
        })
      : await db.execute({
          sql: `UPDATE exam_sessions SET status = 'selesai', ended_at = ? WHERE id = ? AND status = 'aktif'`,
          args: [now(), sessionId],
        })
  return res.rowsAffected > 0
}

export async function getSession(id: number): Promise<SessionRow | undefined> {
  const db = await getDb()
  const res = await db.execute({
    sql: 'SELECT * FROM exam_sessions WHERE id = ?',
    args: [id],
  })
  return mapRows<SessionRow>(res.columns, res.rows)[0]
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

export async function listSessions(limit = 200): Promise<AdminSessionSummary[]> {
  const db = await getDb()
  const res = await db.execute({
    sql: `SELECT s.*, p.name, p.nim, p.kelas,
        (SELECT COUNT(*) FROM exam_events e WHERE e.session_id = s.id AND e.severity = 'info') AS info_count,
        (SELECT COUNT(*) FROM exam_events e WHERE e.session_id = s.id AND e.severity = 'warning') AS warning_count,
        (SELECT COUNT(*) FROM exam_events e WHERE e.session_id = s.id AND e.severity = 'danger') AS danger_count
       FROM exam_sessions s JOIN participants p ON p.id = s.participant_id
       ORDER BY s.started_at DESC LIMIT ?`,
    args: [limit],
  })
  const rows = mapRows<AdminSessionSummary>(res.columns, res.rows)
  for (const r of rows) {
    r.info_count = toNumber(r.info_count)
    r.warning_count = toNumber(r.warning_count)
    r.danger_count = toNumber(r.danger_count)
  }
  return rows
}

export async function getSessionEvents(sessionId: number): Promise<EventRow[]> {
  const db = await getDb()
  const res = await db.execute({
    sql: `SELECT * FROM exam_events WHERE session_id = ? ORDER BY id ASC`,
    args: [sessionId],
  })
  return mapRows<EventRow>(res.columns, res.rows)
}

export async function getSessionWithParticipant(sessionId: number): Promise<(SessionRow & ParticipantRow) | undefined> {
  const db = await getDb()
  const res = await db.execute({
    sql: `SELECT s.*, p.name, p.nim, p.kelas FROM exam_sessions s JOIN participants p ON p.id = s.participant_id WHERE s.id = ?`,
    args: [sessionId],
  })
  return mapRows<SessionRow & ParticipantRow>(res.columns, res.rows)[0]
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

/** Nama file DB lokal (untuk pembersihan/backup admin di mode LAN). */
export function localDbPath(): string {
  return LOCAL_DB_PATH
}
