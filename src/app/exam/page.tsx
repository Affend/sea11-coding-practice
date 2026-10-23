'use client'

/** Pilihan soal untuk Mode Ujian (masuk ke layar penuh terkunci). */
import Link from 'next/link'
import { MODULES, type ModuleKey } from '@/lib/utils'
import { TOPIC_CONTENT } from '@/lib/topic-content'
import { ShieldCheck, Code, Cpu, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

function cnCard(available: boolean) {
  return cn(
    'block p-4 rounded-xl border transition-colors',
    available
      ? 'border-gray-800 bg-[#161b22] hover:border-[#00AA55]/50 hover:bg-[#1a222d]'
      : 'border-gray-900 bg-[#12161c] opacity-50 cursor-not-allowed'
  )
}

function cnBadge(difficulty: string) {
  return cn(
    'px-2 py-0.5 rounded text-[10px] font-medium',
    difficulty === 'Pemula' && 'bg-[#00AA55]/20 text-[#00AA55]',
    difficulty === 'Menengah' && 'bg-[#FF6B00]/20 text-[#FF6B00]',
    difficulty === 'Lanjutan' && 'bg-[#FF3333]/20 text-[#FF3333]'
  )
}

export default function ExamIndexPage() {
  const entries = Object.entries(MODULES) as [ModuleKey, (typeof MODULES)[keyof typeof MODULES]][]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-[#161b22]/95">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/learn" className="p-2 hover:bg-gray-800/60 rounded">
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </Link>
            <div>
              <h1 className="font-bold text-lg">Mode Ujian</h1>
              <p className="text-xs text-gray-500">Layar penuh terkunci + anti-cheat</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#00AA55] bg-[#00AA55]/15 px-3 py-1.5 rounded-lg">
            <ShieldCheck className="w-4 h-4" />
            Copy-paste diizinkan & tercatat
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {entries.map(([key, module]) => {
          const Icon = key === 'c' ? Code : Cpu
          return (
            <section key={key}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0066CC] to-[#00AA55] flex items-center justify-center">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold">{module.name}</h2>
                  <p className="text-xs text-gray-500">{module.description.slice(0, 90)}</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {module.topics.map((topic) => {
                  const adaContent = Boolean(TOPIC_CONTENT[topic.id])
                  return (
                    <Link
                      key={topic.id}
                      href={adaContent ? `/exam/${key}/${topic.id}` : '#'}
                      className={cnCard(adaContent)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{topic.title}</span>
                        <span className={cnBadge(topic.difficulty)}>{topic.difficulty}</span>
                      </div>
                      <p className="text-xs text-gray-500">{topic.estimatedTime} • {adaContent ? 'klik untuk mulai' : 'soal belum tersedia'}</p>
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}
      </main>
    </div>
  )
}
