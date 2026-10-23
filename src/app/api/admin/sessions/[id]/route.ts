import { NextRequest, NextResponse } from 'next/server'
import {
  getSessionEvents,
  getSessionWithParticipant,
  sessionRiskLevel,
  verifyAdminKey,
} from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminKey(request.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Password admin salah' }, { status: 401 })
  }

  const { id } = await params
  const sessionId = Number(id)
  const session = getSessionWithParticipant(sessionId)
  if (!session) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 })
  }

  const events = getSessionEvents(sessionId)
  const counts = {
    info_count: events.filter((e) => e.severity === 'info').length,
    warning_count: events.filter((e) => e.severity === 'warning').length,
    danger_count: events.filter((e) => e.severity === 'danger').length,
  }

  return NextResponse.json({
    session,
    events,
    counts: { info: counts.info_count, warning: counts.warning_count, danger: counts.danger_count },
    risk: sessionRiskLevel({ ...session, ...counts }),
  })
}
