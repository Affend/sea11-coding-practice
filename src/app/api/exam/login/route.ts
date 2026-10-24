import { NextRequest, NextResponse } from 'next/server'
import { upsertParticipant } from '@/lib/db'

export async function POST(request: NextRequest) {
  let body: { name?: string; nim?: string; kelas?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body harus JSON' }, { status: 400 })
  }

  const name = (body.name || '').trim()
  const nim = (body.nim || '').trim()
  const kelas = (body.kelas || '').trim()

  if (!name || !nim) {
    return NextResponse.json({ error: 'Nama dan NIM wajib diisi' }, { status: 400 })
  }

  const participant = await upsertParticipant(name, nim, kelas)
  return NextResponse.json(participant)
}
