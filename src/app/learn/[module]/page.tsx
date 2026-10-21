'use client'

import React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { MODULES, type ModuleKey } from '@/lib/utils'
import { useLearningStore } from '@/lib/store'
import { Sidebar } from '@/components/Sidebar'
import { CodeEditor, LanguageSelector, ThemeSelector } from '@/components/CodeEditor'
import { Console } from '@/components/Console'
import { ArduinoSimulator } from '@/components/ArduinoSimulator'
import { cn } from '@/lib/utils'
import { Play, Square, RotateCcw, Download, Copy, ChevronLeft, Menu, X, Terminal, Cpu, BookOpen, CheckCircle2, Code } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function LearnModulePage() {
  const params = useParams()
  const moduleKey = params.module as ModuleKey
  const module = MODULES[moduleKey]
  const { currentTopic, progress, setCurrentTopic, completeTopic } = useLearningStore()
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [showArduino, setShowArduino] = React.useState(moduleKey === 'arduino')

  if (!module) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Modul tidak ditemukan</h1>
          <Link href="/learn" className="text-primary hover:underline">Kembali ke daftar modul</Link>
        </div>
      </div>
    )
  }

  const isTopicCompleted = (topicId: string) => progress[moduleKey]?.completedTopics?.includes(topicId) || false

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col lg:pl-0">
        {/* Top Bar */}
        <header className="fixed top-0 left-0 right-0 z-40 bg-gray-950/80 backdrop-blur-md border-b border-gray-800 lg:pl-72">
          <div className="max-w-full mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <Link href="/learn" className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded">
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </Link>
              <div>
                <h1 className="font-bold text-lg">{module.name}</h1>
                <p className="text-xs text-gray-500">{module.topics.length} topik • {moduleKey === 'c' ? 'Bahasa C' : 'Arduino C++'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSelector />
              <ThemeSelector />
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg text-sm text-gray-300">
                <Terminal className="w-4 h-4" />
                Konsol
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 pt-16 lg:pl-72 pb-16">
          <div className="max-w-full mx-auto px-4 h-full flex flex-col">
            {/* Topic Tabs */}
            <div className="mb-4 overflow-x-auto pb-2">
              <div className="flex gap-2 min-w-max">
                {module.topics.map((topic, index) => (
                  <Link
                    key={topic.id}
                    href={`/learn/${moduleKey}/${topic.id}`}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2',
                      currentTopic?.id === topic.id
                        ? 'bg-primary text-white'
                        : isTopicCompleted(topic.id)
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    )}
                  >
                    {isTopicCompleted(topic.id) && <CheckCircle2 className="w-4 h-4" />}
                    <span>{index + 1}. {topic.title}</span>
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-[10px]',
                      topic.difficulty === 'Pemula' && 'bg-green-500/20 text-green-400',
                      topic.difficulty === 'Menengah' && 'bg-yellow-500/20 text-yellow-400',
                      topic.difficulty === 'Lanjutan' && 'bg-red-500/20 text-red-400'
                    )}>
                      {topic.difficulty}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* IDE Area */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Editor Toolbar */}
              <div className="flex items-center justify-between p-3 bg-gray-900 border-b border-gray-800 rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-3 py-1">
                    {moduleKey === 'c' ? (
                      <Code className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Cpu className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm font-medium text-gray-300">
                      {currentTopic?.title || 'Pilih topik dari sidebar'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors" title="Download">
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors" title="Salin">
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
                <div className="w-96 lg:w-1/3 border-l border-gray-800 flex flex-col min-w-0 bg-gray-950">
                  <div className="flex items-center justify-between p-3 bg-gray-900 border-b border-gray-800">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowArduino(false)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                          !showArduino ? 'bg-primary text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
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
                            showArduino ? 'bg-secondary text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
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

            {/* Action Buttons */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primaryDark transition-colors font-medium">
                  <Play className="w-5 h-5" />
                  Jalankan (Ctrl+Enter)
                </button>
                <button className="flex items-center gap-2 px-6 py-3 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors font-medium">
                  <Square className="w-5 h-5" />
                  Berhenti
                </button>
                <button className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors font-medium">
                  <RotateCcw className="w-5 h-5" />
                  Reset
                </button>
              </div>
              {currentTopic && !isTopicCompleted(currentTopic.id) && (
                <button
                  onClick={() => completeTopic(moduleKey, currentTopic.id)}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors font-medium"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Tandai Selesai (+100 XP)
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}