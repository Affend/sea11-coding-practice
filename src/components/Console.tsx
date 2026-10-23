'use client'

import React, { useRef, useEffect, useState } from 'react'
import { useExecutionStore, useArduinoSimulatorStore, useCodeEditorStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { X, Terminal, Trash2, Copy, Maximize2, Minimize2, Send, Search, Download } from 'lucide-react'

export function Console() {
  const { output, error, isRunning, executionTime, memoryUsed, clear } = useExecutionStore()
  const { serialOutput, setSerialInput } = useArduinoSimulatorStore()
  const [isMaximized, setIsMaximized] = React.useState(false)
  const consoleRef = useRef<HTMLDivElement>(null)
  const [localSerialInput, setLocalSerialInput] = React.useState('')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [filterType, setFilterType] = React.useState<'all' | 'output' | 'error' | 'serial'>('all')

  const allOutput = [
    ...(output ? [{ type: 'output' as const, content: output }] : []),
    ...(error ? [{ type: 'error' as const, content: error }] : []),
    ...serialOutput.map((line) => ({ type: 'serial' as const, content: line })),
  ]

  const filteredOutput = allOutput.filter(item => 
    filterType === 'all' || item.type === filterType
  ).filter(item =>
    searchQuery === '' || item.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [allOutput])

  const handleSerialSend = () => {
    if (localSerialInput.trim()) {
      setSerialInput(localSerialInput.trim())   // Serial.read()/available() di simulator membaca ini
      setLocalSerialInput('')
    }
  }

  const copyOutput = () => {
    const text = allOutput.map((o) => o.content).join('\n')
    navigator.clipboard.writeText(text)
  }

  const downloadLog = () => {
    const text = allOutput.map((o) => o.content).join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `console-log-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getStats = () => {
    const outputs = allOutput.filter(o => o.type === 'output').length
    const errors = allOutput.filter(o => o.type === 'error').length
    const serial = allOutput.filter(o => o.type === 'serial').length
    return { outputs, errors, serial }
  }

  if (!output && !error && serialOutput.length === 0 && !isRunning) {
    return (
      <div className={cn('bg-[#0d1117] border-t border-gray-800 rounded-b-xl', isMaximized && 'fixed inset-4 z-50')}>
        <div className="flex items-center justify-between p-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">Konsol</span>
            {isRunning && (
              <span className="flex items-center gap-1 text-xs text-[#0066CC]">
                <span className="w-1.5 h-1.5 bg-[#0066CC] rounded-full animate-pulse"></span>
                Menjalankan...
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/60 rounded-lg transition-colors"
              title={isMaximized ? 'Kecilkan' : 'Perluas'}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={clear}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/60 rounded-lg transition-colors"
              title="Bersihkan"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={copyOutput}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/60 rounded-lg transition-colors"
              title="Salin"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 p-4 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <Terminal className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Konsol kosong</p>
            <p className="text-xs mt-1">Klik &quot;Jalankan&quot; untuk mengeksekusi kode</p>
          </div>
        </div>
        {isMaximized && (
          <button
            onClick={() => setIsMaximized(false)}
            className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/60 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }

  const stats = getStats()

  return (
    <div
      className={cn(
        'bg-[#0d1117] border-t border-gray-800 rounded-b-xl flex flex-col',
        isMaximized && 'fixed inset-4 z-50 max-h-[calc(100vh-2rem)]'
      )}
      ref={consoleRef}
    >
      <div className="flex items-center justify-between p-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Konsol</span>
          {isRunning && (
            <span className="flex items-center gap-1 text-xs text-[#0066CC]">
              <span className="w-1.5 h-1.5 bg-[#0066CC] rounded-full animate-pulse"></span>
              Menjalankan...
            </span>
          )}
          {executionTime > 0 && (
            <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-800/60 rounded">
              {executionTime}ms • {memoryUsed}KB
            </span>
          )}
          <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-800/60 rounded">
            {stats.outputs} out • {stats.errors} err • {stats.serial} serial
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari output..."
              className="bg-gray-800/60 border border-gray-700/50 rounded-lg px-8 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#0066CC] w-40"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'output' | 'error' | 'serial')}
            className="bg-gray-800/60 border border-gray-700/50 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#0066CC] appearance-none"
          >
            <option value="all">Semua</option>
            <option value="output">Output</option>
            <option value="error">Error</option>
            <option value="serial">Serial</option>
          </select>
          <button
            onClick={copyOutput}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/60 rounded-lg transition-colors"
            title="Salin"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={downloadLog}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/60 rounded-lg transition-colors"
            title="Download Log"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={clear}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/60 rounded-lg transition-colors"
            title="Bersihkan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/60 rounded-lg transition-colors"
            title={isMaximized ? 'Kecilkan' : 'Perluas'}
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 font-mono text-sm min-h-[150px]">
        {filteredOutput.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            <p>{searchQuery || filterType !== 'all' ? 'Tidak ada hasil pencarian' : 'Konsol siap...'}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredOutput.map((item, index) => (
              <div
                key={index}
                className={cn(
                  'px-2 py-1 rounded whitespace-pre-wrap break-all',
                  item.type === 'output' && 'text-gray-300',
                  item.type === 'error' && 'text-[#FF3333]',
                  item.type === 'serial' && 'text-[#00AA55]'
                )}
              >
                {item.type === 'serial' && <span className="text-gray-500 mr-2">[Serial] </span>}
                {item.type === 'error' && <span className="text-[#FF3333] mr-2">[Error] </span>}
                {item.content}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Serial Input for Arduino */}
      <div className="border-t border-gray-800 p-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-800/60 rounded">Serial Input</span>
          <input
            type="text"
            value={localSerialInput}
            onChange={(e) => setLocalSerialInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSerialSend()}
            placeholder="Kirim data ke Arduino..."
            className="flex-1 bg-gray-800/60 border border-gray-700/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0066CC] appearance-none"
          />
          <button
            onClick={handleSerialSend}
            disabled={!localSerialInput.trim()}
            className="px-3 py-1.5 bg-gradient-to-r from-[#0066CC] to-[#00AA55] text-white text-sm rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#0066CC]/25"
          >
            <Send className="w-4 h-4 mr-1" />
            Kirim
          </button>
        </div>
      </div>
      {isMaximized && (
        <button
          onClick={() => setIsMaximized(false)}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/60 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export function StatusBar() {
  const { language } = React.useContext(
    React.createContext({
      language: 'c' as 'c' | 'cpp',
      setLanguage: () => {},
    })
  )
  const { theme } = useCodeEditorStore()
  const { isRunning } = useExecutionStore()

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-t border-gray-800 rounded-t-xl">
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#00AA55]" />
          Siap
        </span>
        <span>{language.toUpperCase()}</span>
        <span>UTF-8</span>
        <span>LF</span>
        <span>Spaces: 4</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span>{theme === 'vs-dark' ? 'Dark' : theme === 'vs-light' ? 'Light' : 'HC'}</span>
        {isRunning && (
          <span className="flex items-center gap-1 text-[#0066CC]">
            <span className="w-1.5 h-1.5 bg-[#0066CC] rounded-full animate-pulse"></span>
            Running...
          </span>
        )}
      </div>
    </div>
  )
}