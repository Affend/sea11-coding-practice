import { NextRequest, NextResponse } from 'next/server'
import { getSession, insertEvents, type IncomingExamEvent } from '@/lib/db'

/** Terima batch event anti-cheat dari klien; dipanggil berkala & saat sesi berakhir. */
export async function POST(request: NextRequest) {
  let body: { sessionId?: number; events?: IncomingExamEvent[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body harus JSON' }, { status: 400 })
  }

  const sessionId = Number(body.sessionId)
  if (!sessionId || Number.isNaN(sessionId)) {
    return NextResponse.json({ error: 'sessionId wajib diisi' }, { status: 400 })
  }
  if (!getSession(sessionId)) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 })
  }

  const events = Array.isArray(body.events) ? body.events.slice(0, 500) : []
  const inserted = insertEvents(sessionId, events)
  return NextResponse.json({ inserted })
}
