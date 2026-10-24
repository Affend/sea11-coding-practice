import { NextRequest, NextResponse } from 'next/server'
import { listSessions, sessionRiskLevel, verifyAdminKey } from '@/lib/db'

export async function GET(request: NextRequest) {
  if (!verifyAdminKey(request.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Password admin salah' }, { status: 401 })
  }

  const sessions = await listSessions()
  return NextResponse.json({
    sessions: sessions.map((s) => ({
      ...s,
      risk: sessionRiskLevel(s),
    })),
  })
}
