import { NextRequest, NextResponse } from 'next/server'
import { createSession, getParticipant } from '@/lib/db'

export async function POST(request: NextRequest) {
  let body: { participantId?: number; module?: string; topic?: string; codeSnapshot?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body harus JSON' }, { status: 400 })
  }

  const participantId = Number(body.participantId)
  const moduleSlug = (body.module || '').trim()
  const topic = (body.topic || '').trim()

  if (!participantId || Number.isNaN(participantId)) {
    return NextResponse.json({ error: 'participantId wajib diisi (login dulu)' }, { status: 400 })
  }
  if (!getParticipant(participantId)) {
    return NextResponse.json({ error: 'Praktikan tidak ditemukan, login ulang' }, { status: 404 })
  }
  if (!moduleSlug || !topic) {
    return NextResponse.json({ error: 'module dan topic wajib diisi' }, { status: 400 })
  }

  const session = createSession(participantId, moduleSlug, topic, body.codeSnapshot || '')
  return NextResponse.json(session, { status: 201 })
}
