import { NextRequest, NextResponse } from 'next/server'
import { endSession, getSession, type IncomingExamEvent } from '@/lib/db'

/** Akhiri sesi ujian; kirim event sisa + snapshot kode terakhir. */
export async function POST(request: NextRequest) {
  let body: { sessionId?: number; events?: IncomingExamEvent[]; codeSnapshot?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body harus JSON' }, { status: 400 })
  }

  const sessionId = Number(body.sessionId)
  if (!sessionId || Number.isNaN(sessionId)) {
    return NextResponse.json({ error: 'sessionId wajib diisi' }, { status: 400 })
  }
  const session = getSession(sessionId)
  if (!session) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 })
  }

  endSession(sessionId, Array.isArray(body.events) ? body.events.slice(0, 500) : [], body.codeSnapshot)
  return NextResponse.json({ ok: true })
}
