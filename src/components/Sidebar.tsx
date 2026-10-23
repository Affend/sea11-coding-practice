'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MODULES, type ModuleKey } from '@/lib/utils'
import { useLearningStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { ShieldAlert, ShieldCheck, CheckCircle2, BookOpen, Cpu, Zap, Trophy, X, Code } from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { currentModule, currentTopic, progress, totalXP, setCurrentModule } = useLearningStore()

  const getTopicProgress = (moduleId: ModuleKey, topicId: string) => {
    return progress[moduleId]?.completedTopics?.includes(topicId) || false
  }

  const getModuleProgress = (moduleId: ModuleKey) => {
    const mod = MODULES[moduleId]
    const completed = progress[moduleId]?.completedTopics?.length || 0
    return { completed, total: mod.topics.length }
  }

  const ModuleIcon = ({ moduleId }: { moduleId: ModuleKey }) => {
    if (moduleId === 'c') return <Code className="w-5 h-5" />
    if (moduleId === 'arduino') return <Cpu className="w-5 h-5" />
    return <BookOpen className="w-5 h-5" />
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#0d1117] border-r border-gray-800 transform transition-transform duration-300 flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header - Figma Style */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <Link href="/learn" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0066CC] to-[#00AA55] flex items-center justify-center shadow-lg shadow-primary/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                SEA Laboratory
              </span>
              <span className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">Telkom University</span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/60 rounded transition-colors"
            aria-label="Tutup sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* XP & Streak - Figma Style */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-300">XP Total</span>
            <span className="text-lg font-extrabold bg-gradient-to-r from-[#0066CC] to-[#00AA55] bg-clip-text text-transparent">{totalXP}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#0066CC] to-[#00AA55] transition-all duration-500"
              style={{ width: `${Math.min((totalXP % 1000) / 10, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>Level {Math.floor(totalXP / 1000) + 1}</span>
            <span>{1000 - (totalXP % 1000)} XP ke level berikutnya</span>
          </div>
        </div>

        {/* Module Navigation - Figma Style */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-3">
          {Object.entries(MODULES).map(([moduleKey, module]) => {
            const moduleId = moduleKey as ModuleKey
            const moduleProgress = getModuleProgress(moduleId)
            const isActive = currentModule === moduleId

            return (
              <div key={moduleKey} className={cn('group', isActive && 'text-primary')}>
                <button
                  onClick={() => setCurrentModule(moduleId)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl transition-colors',
                    isActive ? 'bg-[#0066CC]/10 text-white' : 'text-gray-300 hover:bg-gray-800/60'
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                      isActive
                        ? 'bg-gradient-to-br from-[#0066CC] to-[#00AA55] text-white'
                        : 'bg-gray-800/60 text-gray-400 group-hover:bg-gray-800 group-hover:text-white'
                    )}
                  >
                    <ModuleIcon moduleId={moduleId} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate text-white">{module.name}</p>
                    <p className="text-xs text-gray-500 truncate">{moduleProgress.completed}/{moduleProgress.total} selesai</p>
                  </div>
                  {moduleProgress.completed === moduleProgress.total && moduleProgress.total > 0 && (
                    <CheckCircle2 className="w-5 h-5 text-[#00AA55] flex-shrink-0" />
                  )}
                </button>

                {isActive && (
                  <div className="mt-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
                    {module.topics.map((topic) => {
                      const isCompleted = getTopicProgress(moduleId, topic.id)
                      const isCurrent = currentTopic?.id === topic.id

                      return (
                        <Link
                          key={topic.id}
                          href={`/learn/${moduleId}/${topic.id}`}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors pl-10',
                            isCurrent
                              ? 'bg-[#0066CC]/10 text-[#0066CC] font-medium'
                              : isCompleted
                              ? 'text-gray-400 hover:bg-gray-800/60'
                              : 'text-gray-500 hover:bg-gray-800/60 hover:text-gray-300'
                          )}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-[#00AA55] flex-shrink-0" />
                          ) : (
                            <span className="w-4 h-4 flex-shrink-0" />
                          )}
                          <span className="flex-1 truncate">{topic.title}</span>
                          <span className="text-xs text-gray-500 flex-shrink-0">{topic.estimatedTime}</span>
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded text-xs flex-shrink-0 font-medium',
                              topic.difficulty === 'Pemula' && 'bg-[#00AA55]/20 text-[#00AA55]',
                              topic.difficulty === 'Menengah' && 'bg-[#FF6B00]/20 text-[#FF6B00]',
                              topic.difficulty === 'Lanjutan' && 'bg-[#FF3333]/20 text-[#FF3333]'
                            )}
                          >
                            {topic.difficulty}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Aksi Khusus - Mode Ujian & Admin */}
        <div className="px-3 pt-3 border-t border-gray-800 space-y-1">
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-3 p-2.5 rounded-xl text-sm transition-colors',
              pathname.startsWith('/admin')
                ? 'bg-[#FF3333]/15 text-[#FF8888]'
                : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-300'
            )}
          >
            <div className="w-8 h-8 rounded-lg bg-[#FF3333]/15 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-4 h-4 text-[#FF3333]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-xs text-white">Panel Admin</p>
              <p className="text-[10px] text-gray-500 truncate">Pantau anti-cheat</p>
            </div>
          </Link>
          <Link
            href="/exam"
            className={cn(
              'flex items-center gap-3 p-2.5 rounded-xl text-sm transition-colors',
              pathname.startsWith('/exam')
                ? 'bg-[#00AA55]/15 text-[#66d59a]'
                : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-300'
            )}
          >
            <div className="w-8 h-8 rounded-lg bg-[#00AA55]/15 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-[#00AA55]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-xs text-white">Mode Ujian</p>
              <p className="text-[10px] text-gray-500 truncate">Layar penuh terkunci</p>
            </div>
          </Link>
        </div>

        {/* Footer - Figma Style */}
        <div className="p-4 border-t border-gray-800">
          <Link
            href="/leaderboard"
            className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/60 hover:bg-gray-800 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-[#FF6B00]/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[#FF6B00]" />
            </div>
            <div>
              <p className="font-semibold text-sm text-white">Papan Peringkat</p>
              <p className="text-xs text-gray-500">Lihat posisi kamu</p>
            </div>
          </Link>
        </div>
      </aside>
    </>
  )
}