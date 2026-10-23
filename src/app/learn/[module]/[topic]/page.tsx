'use client'

import React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { MODULES, type ModuleKey, type Topic } from '@/lib/utils'
import { useLearningStore } from '@/lib/store'
import { Sidebar } from '@/components/Sidebar'
import { CodeEditor, LanguageSelector, ThemeSelector } from '@/components/CodeEditor'
import { Console } from '@/components/Console'
import { ArduinoSimulator } from '@/components/ArduinoSimulator'
import { cn } from '@/lib/utils'
import { TOPIC_CONTENT } from '@/lib/topic-content'
import { useExecutionStore } from '@/lib/store'
import { useCodeRunner } from '@/hooks/useCodeRunner'
import { Play, Square, RotateCcw, Download, Copy, ChevronLeft, Menu, X, Terminal, Cpu, BookOpen, CheckCircle2, ArrowLeft, ArrowRight, Code } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function LearnTopicPage() {
  const params = useParams()
  const moduleKey = params.module as ModuleKey
  const topicId = params.topic as string
  const moduleData = MODULES[moduleKey]
  const topic = moduleData?.topics.find(t => t.id === topicId)
  const content = TOPIC_CONTENT[topicId]
  const { currentTopic, progress, setCurrentTopic, completeTopic } = useLearningStore()
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [showArduino, setShowArduino] = React.useState(moduleKey === 'arduino')
  const { run, stop, reset, isCompiling } = useCodeRunner()
  const executionRunning = useExecutionStore((s) => s.isRunning)

  if (!moduleData || !topic || !content) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Topik tidak ditemukan</h1>
          <a href={`/learn/${moduleKey}`} className="text-primary hover:underline">Kembali ke modul</a>
        </div>
      </div>
    )
  }

  const isCompleted = progress[moduleKey]?.completedTopics?.includes(topicId) || false
  const prevTopic = moduleData.topics[moduleData.topics.indexOf(topic) - 1]
  const nextTopic = moduleData.topics[moduleData.topics.indexOf(topic) + 1]

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col lg:pl-0">
        {/* Top Bar - Figma Style */}
        <header className="fixed top-0 left-0 right-0 z-40 bg-[#0d1117]/90 backdrop-blur-md border-b border-gray-800/80 lg:pl-72">
          <div className="max-w-full mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800/60 rounded"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <Link href={`/learn/${moduleKey}`} className="flex items-center gap-2 p-2 hover:bg-gray-800/60 rounded transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </Link>
              <div>
                <h1 className="font-bold text-lg text-white">{topic.title}</h1>
                <p className="text-xs text-gray-500">{moduleData.name} • {topic.estimatedTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSelector />
              <ThemeSelector />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 pt-16 lg:pl-72 pb-16">
          <div className="max-w-full mx-auto px-4 h-full flex flex-col">
            {/* Topic Header - Figma Style */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${moduleKey === 'c' ? 'bg-gradient-to-br from-[#0066CC] to-[#00AA55]' : 'bg-gradient-to-br from-[#00AA55] to-[#FF6B00]'}`}>
                  {moduleKey === 'c' ? <Code className="w-5 h-5 text-white" /> : <Cpu className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{topic.title}</h2>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <span className={`
                      px-2 py-0.5 rounded text-xs font-medium
                      ${topic.difficulty === 'Pemula' ? 'bg-[#00AA55]/20 text-[#00AA55]' : ''}
                      ${topic.difficulty === 'Menengah' ? 'bg-[#FF6B00]/20 text-[#FF6B00]' : ''}
                      ${topic.difficulty === 'Lanjutan' ? 'bg-[#FF3333]/20 text-[#FF3333]' : ''}
                    `}>
                      {topic.difficulty}
                    </span>
                    <span>{topic.estimatedTime}</span>
                    {isCompleted && (
                      <span className="flex items-center gap-1 text-[#00AA55]">
                        <CheckCircle2 className="w-4 h-4" />
                        Selesai
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-gray-300">{content.description}</p>
            </div>

            {/* Learning Objectives - Figma Style */}
            <div className="mb-6 p-4 bg-[#161b22] rounded-xl border border-gray-800">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-white">
                <BookOpen className="w-5 h-5 text-[#0066CC]" />
                Tujuan Pembelajaran
              </h3>
              <ul className="space-y-2 mb-4">
                {content.learningObjectives.map((obj, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0066CC]/50" />
                    {obj}
                  </li>
                ))}
              </ul>

              {/* Panduan Pengerjaan Soal & Solusi Jika Salah */}
              <div className="pt-4 border-t border-gray-800 space-y-3">
                <div className="p-3 bg-[#0d1117] rounded-lg border border-gray-800/80">
                  <h4 className="font-semibold text-xs text-[#0066CC] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    💡 Cara Pengerjaan Soal
                  </h4>
                  <ol className="list-decimal list-inside text-xs text-gray-300 space-y-1 pl-1">
                    <li>Baca instruksi <code className="text-primary font-mono">{'// TODO:'}</code> yang ada di editor kode.</li>
                    <li>Tuliskan sintaks C/C++ yang diminta untuk menyelesaikan soal.</li>
                    <li>Tekan tombol <strong className="text-white">Jalankan (Ctrl+Enter)</strong> untuk mengeksekusi kode di konsol.</li>
                    <li>Jika output sesuai, tekan <strong className="text-white">Selesai (+100 XP)</strong> untuk mengklaim poin.</li>
                  </ol>
                </div>

                <div className="p-3 bg-[#0d1117] rounded-lg border border-gray-800/80">
                  <h4 className="font-semibold text-xs text-[#FF3333] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    🛠️ Solusi Jika Jawaban Salah / Error
                  </h4>
                  <ul className="list-disc list-inside text-xs text-gray-300 space-y-1 pl-1">
                    <li><strong className="text-white">Syntax Error (Merah):</strong> Cek titik koma (<code className="font-mono text-amber-400">;</code>) di akhir baris dan kurung kurawal (<code className="font-mono text-amber-400">{}</code>) yang belum ditutup.</li>
                    <li><strong className="text-white">Output Salah:</strong> Perhatikan format specifier di <code className="font-mono text-amber-400">printf</code> (misal: <code className="font-mono">%d</code> untuk int, <code className="font-mono">%f</code> untuk float) dan penulisan huruf besar/kecil (case sensitive).</li>
                    <li><strong className="text-white">Reset Kode:</strong> Klik tombol <strong className="text-white">Reset</strong> di bawah jika ingin mengembalikan kode ke template awal.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* IDE Area */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Editor Toolbar - Figma Style */}
              <div className="flex items-center justify-between p-3 bg-[#161b22] border-b border-gray-800 rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-gray-800/60 rounded-lg px-3 py-1">
                    {moduleKey === 'c' ? <Code className="w-4 h-4 text-gray-400" /> : <Cpu className="w-4 h-4 text-gray-400" />}
                    <span className="text-sm font-medium text-gray-200">{topic.title}</span>
                    <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-700/60 rounded">
                      {moduleKey === 'c' ? 'C' : 'C++'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/60 rounded transition-colors" title="Download">
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/60 rounded transition-colors" title="Salin">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editor + Console Split */}
              <div className="flex-1 flex min-h-0">
                {/* Left: Editor */}
                <div className="flex-1 flex flex-col min-w-0">
                  <CodeEditor height="calc(100% - 50px)" />
                </div>

                {/* Right: Console/Arduino */}
                <div className="w-96 lg:w-1/3 border-l border-gray-800 flex flex-col min-w-0 bg-[#0d1117]">
                  <div className="flex items-center justify-between p-3 bg-[#161b22] border-b border-gray-800">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowArduino(false)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                          !showArduino ? 'bg-[#0066CC] text-white' : 'bg-gray-800/60 text-gray-300 hover:bg-gray-800'
                        )}
                      >
                        <Terminal className="w-4 h-4 mr-1" />
                        Konsol
                      </button>
                      {moduleKey === 'arduino' && (
                        <button
                          onClick={() => setShowArduino(true)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                            showArduino ? 'bg-[#00AA55] text-white' : 'bg-gray-800/60 text-gray-300 hover:bg-gray-800'
                          )}
                        >
                          <Cpu className="w-4 h-4 mr-1" />
                          Arduino
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-h-0">
                    {showArduino && moduleKey === 'arduino' ? (
                      <ArduinoSimulator />
                    ) : (
                      <Console />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons - Figma Style */}
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => void run()}
                  disabled={isCompiling || executionRunning}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#0066CC] to-[#00AA55] text-white rounded-xl hover:opacity-90 transition-all font-medium shadow-lg shadow-[#0066CC]/25 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Play className="w-5 h-5" />
                  {isCompiling ? 'Mengompilasi...' : executionRunning ? 'Menjalankan...' : 'Jalankan (Ctrl+Enter)'}
                </button>
                <button
                  onClick={stop}
                  className="flex items-center gap-2 px-6 py-3 bg-[#FF3333]/20 text-[#FF3333] rounded-xl hover:bg-[#FF3333]/30 transition-colors font-medium"
                >
                  <Square className="w-5 h-5" />
                  Berhenti
                </button>
                <button
                  onClick={() => reset(content.starterCode)}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-800/60 text-gray-300 rounded-xl hover:bg-gray-800 transition-colors font-medium"
                >
                  <RotateCcw className="w-5 h-5" />
                  Reset
                </button>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {!isCompleted && (
                  <button
                    onClick={() => completeTopic(moduleKey, topicId)}
                    className="flex items-center gap-2 px-6 py-3 bg-[#00AA55]/20 text-[#00AA55] rounded-xl hover:bg-[#00AA55]/30 transition-colors font-medium"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Selesai (+100 XP)
                  </button>
                )}
                {prevTopic && (
                  <Link
                    href={`/learn/${moduleKey}/${prevTopic.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800/60 text-gray-300 rounded-xl hover:bg-gray-800 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Sebelumnya
                  </Link>
                )}
                {nextTopic && (
                  <Link
                    href={`/learn/${moduleKey}/${nextTopic.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#0066CC] to-[#00AA55] text-white rounded-xl hover:opacity-90 transition-all font-medium shadow-lg shadow-[#0066CC]/25"
                  >
                    Selanjutnya
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}