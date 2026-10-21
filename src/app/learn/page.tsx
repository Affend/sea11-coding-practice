import Link from 'next/link'
import { MODULES } from '@/lib/utils'
import { Code, Cpu, ChevronRight, BookOpen, Zap, Trophy, Video, FileText } from 'lucide-react'

export default function LearnIndexPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Navigation - Figma Style */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0d1117]/90 backdrop-blur-md border-b border-gray-800/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0066CC] to-[#00AA55] flex items-center justify-center shadow-lg shadow-primary/20">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                SEA Laboratory Coding Practice
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1 bg-gray-900/60 p-1.5 rounded-full border border-gray-800/80">
              <Link href="/" className="px-5 py-2 rounded-full text-gray-300 hover:text-white hover:bg-gray-800/60 text-sm font-medium transition-all">
                Beranda
              </Link>
              <Link href="/learn" className="px-5 py-2 rounded-full bg-primary text-white text-sm font-medium shadow-sm transition-all">
                Learning
              </Link>
              <Link href="#assistant" className="px-5 py-2 rounded-full text-gray-300 hover:text-white hover:bg-gray-800/60 text-sm font-medium transition-all">
                Assistant
              </Link>
              <Link href="#contact" className="px-5 py-2 rounded-full text-gray-300 hover:text-white hover:bg-gray-800/60 text-sm font-medium transition-all">
                Contact
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/learn"
                className="px-6 py-2.5 bg-gradient-to-r from-[#0066CC] to-[#00AA55] text-white rounded-full hover:opacity-90 transition-all font-medium text-sm shadow-md shadow-primary/20 flex items-center gap-2"
              >
                Mulai Belajar
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-[50vh] flex items-center justify-center pt-24 pb-16 overflow-hidden bg-[#0d1117]">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d1117] via-[#0d1117] to-[#161b22]" />
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#0066CC]/15 via-transparent to-[#00AA55]/10 blur-3xl animate-pulse-slow" />
          <div className="absolute inset-0 bg-grid-pattern opacity-40" />
          <div className="absolute inset-0 bg-dots-pattern opacity-20" />
        </div>
        
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0066CC]/10 text-[#0066CC] text-xs font-semibold mb-6 border border-[#0066CC]/20 tracking-wide uppercase">
            <BookOpen className="w-4 h-4" />
            Pilih Modul Pembelajaran
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
            Mulai Belajar<br />
            <span className="bg-gradient-to-r from-[#0066CC] via-[#00AA55] to-[#FF6B00] bg-clip-text text-transparent">
              Algoritma & Struktur Data
            </span>
          </h1>
          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto mb-10">
            Pilih jalur pembelajaran yang sesuai dengan minat dan kebutuhan praktikum kamu
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/learn/c"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#0066CC] to-[#00AA55] text-white rounded-xl hover:opacity-90 transition-all font-medium text-base flex items-center justify-center gap-2 shadow-lg shadow-[#0066CC]/25"
            >
              <Video className="w-5 h-5" />
              Mulai C
            </Link>
            <Link
              href="/learn/arduino"
              className="w-full sm:w-auto px-8 py-4 bg-gray-800/80 text-white rounded-xl hover:bg-gray-700/80 transition-all font-medium text-base flex items-center justify-center gap-2 border border-gray-700/60"
            >
              <FileText className="w-5 h-5" />
              Arduino
            </Link>
          </div>
        </div>
      </section>

      {/* Modules Grid */}
      <section className="py-24 px-6 bg-[#0d1117]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            {Object.entries(MODULES).map(([key, module]) => (
              <Link
                key={key}
                href={`/learn/${key}`}
                className="group relative p-8 bg-[#161b22] rounded-2xl border border-gray-800 hover:border-primary/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(0,102,204,0.15)] overflow-hidden"
              >
                <div className="relative z-10">
                  <div className="flex items-start gap-4 mb-6">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${key === 'c' ? 'from-[#0066CC] to-[#00AA55]' : 'from-[#00AA55] to-[#FF6B00]'}`}>
                      {key === 'c' ? <Code className="w-8 h-8 text-white" /> : <Cpu className="w-8 h-8 text-white" />}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white group-hover:text-primary transition-colors">{module.name}</h2>
                      <p className="text-gray-400 mt-1">{module.description}</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    {module.topics.map((topic, index) => (
                      <div key={topic.id} className="flex items-center justify-between p-3.5 bg-[#0d1117]/60 rounded-xl border border-gray-800/50 group-hover:border-gray-700/50 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-sm font-semibold text-gray-400 group-hover:text-white group-hover:bg-primary/20 transition-all">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-gray-200">{topic.title}</p>
                            <p className="text-xs text-gray-500">{topic.estimatedTime}</p>
                          </div>
                        </div>
                        <span className={`
                          px-2.5 py-1 rounded-lg text-xs font-medium
                          ${topic.difficulty === 'Pemula' ? 'bg-[#00AA55]/20 text-[#00AA55]' : ''}
                          ${topic.difficulty === 'Menengah' ? 'bg-[#FF6B00]/20 text-[#FF6B00]' : ''}
                          ${topic.difficulty === 'Lanjutan' ? 'bg-[#FF3333]/20 text-[#FF3333]' : ''}
                        `}>
                          {topic.difficulty}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {module.topics.length} Topik
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy className="w-4 h-4" />
                        {module.topics.length * 100} XP
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-1 text-primary font-semibold text-sm group-hover:gap-2 transition-all">
                      <span>Mulai Belajar</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Learning Path Guide */}
          <div className="mt-16 p-8 bg-gradient-to-br from-[#161b22] to-[#0d1117] rounded-2xl border border-gray-800">
            <h3 className="text-2xl font-extrabold mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0066CC] to-[#00AA55] flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              Jalur Pembelajaran yang Direkomendasikan
            </h3>
            <div className="grid md:grid-cols-2 gap-8 text-gray-300">
              <div className="p-6 bg-[#0d1117]/60 rounded-xl border border-gray-800/50">
                <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#0066CC]/20 flex items-center justify-center">
                    <Code className="w-4 h-4 text-[#0066CC]" />
                  </div>
                  Pemula: Algoritma & Pemrograman C
                </h4>
                <ol className="space-y-3 text-sm">
                  <li className="flex items-center gap-3 p-2 bg-[#0d1117]/40 rounded-lg"><span className="w-6 h-6 rounded-full bg-[#0066CC]/20 flex items-center justify-center text-xs font-bold text-[#0066CC]">1</span> Dasar C & Hello World</li>
                  <li className="flex items-center gap-3 p-2 bg-[#0d1117]/40 rounded-lg"><span className="w-6 h-6 rounded-full bg-[#0066CC]/20 flex items-center justify-center text-xs font-bold text-[#0066CC]">2</span> Variabel & Tipe Data</li>
                  <li className="flex items-center gap-3 p-2 bg-[#0d1117]/40 rounded-lg"><span className="w-6 h-6 rounded-full bg-[#0066CC]/20 flex items-center justify-center text-xs font-bold text-[#0066CC]">3</span> Kontrol Aliran</li>
                  <li className="flex items-center gap-3 p-2 bg-[#0d1117]/40 rounded-lg"><span className="w-6 h-6 rounded-full bg-[#0066CC]/20 flex items-center justify-center text-xs font-bold text-[#0066CC]">4</span> Fungsi & Rekursi</li>
                  <li className="flex items-center gap-3 p-2 bg-[#0d1117]/40 rounded-lg"><span className="w-6 h-6 rounded-full bg-[#0066CC]/20 flex items-center justify-center text-xs font-bold text-[#0066CC]">5</span> Array & String</li>
                  <li className="flex items-center gap-3 p-2 bg-[#0d1117]/40 rounded-lg"><span className="w-6 h-6 rounded-full bg-[#0066CC]/20 flex items-center justify-center text-xs font-bold text-[#0066CC]">6</span> Pointer & Memori</li>
                </ol>
              </div>
              <div className="p-6 bg-[#0d1117]/60 rounded-xl border border-gray-800/50">
                <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#00AA55]/20 flex items-center justify-center">
                    <Cpu className="w-4 h-4 text-[#00AA55]" />
                  </div>
                  Lanjutan: Struktur Data Arduino
                </h4>
                <ol className="space-y-3 text-sm">
                  <li className="flex items-center gap-3 p-2 bg-[#0d1117]/40 rounded-lg"><span className="w-6 h-6 rounded-full bg-[#00AA55]/20 flex items-center justify-center text-xs font-bold text-[#00AA55]">1</span> Dasar Arduino & Setup</li>
                  <li className="flex items-center gap-3 p-2 bg-[#0d1117]/40 rounded-lg"><span className="w-6 h-6 rounded-full bg-[#00AA55]/20 flex items-center justify-center text-xs font-bold text-[#00AA55]">2</span> Array & Buffer Sirkuler</li>
                  <li className="flex items-center gap-3 p-2 bg-[#0d1117]/40 rounded-lg"><span className="w-6 h-6 rounded-full bg-[#00AA55]/20 flex items-center justify-center text-xs font-bold text-[#00AA55]">3</span> Linked List Dinamis</li>
                  <li className="flex items-center gap-3 p-2 bg-[#0d1117]/40 rounded-lg"><span className="w-6 h-6 rounded-full bg-[#00AA55]/20 flex items-center justify-center text-xs font-bold text-[#00AA55]">4</span> Stack & Queue</li>
                  <li className="flex items-center gap-3 p-2 bg-[#0d1117]/40 rounded-lg"><span className="w-6 h-6 rounded-full bg-[#00AA55]/20 flex items-center justify-center text-xs font-bold text-[#00AA55]">5</span> Binary Tree & BST</li>
                  <li className="flex items-center gap-3 p-2 bg-[#0d1117]/40 rounded-lg"><span className="w-6 h-6 rounded-full bg-[#00AA55]/20 flex items-center justify-center text-xs font-bold text-[#00AA55]">6</span> Graph & Pathfinding</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Figma Style */}
      <footer className="py-10 px-6 border-t border-gray-800 bg-[#0d1117]">
        <div className="max-w-7xl mx-auto text-center">
          <Link href="/" className="flex items-center gap-3 justify-center mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0066CC] to-[#00AA55] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl text-white">SEA Laboratory</span>
          </Link>
          <p className="text-gray-500 text-sm">
            © 2025 Telkom University — Teknik Komputer. Software Engineering Application. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}