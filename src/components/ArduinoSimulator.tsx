'use client'

import React, { useRef, useState, useEffect } from 'react'
import { useArduinoSimulatorStore, useCodeEditorStore } from '@/lib/store'
import { ArduinoRunner, type PinModeName } from '@/lib/arduino-interpreter'
import { CircuitBoard } from './CircuitBoard'
import { cn } from '@/lib/utils'
import { Play, Pause, Square, RotateCcw, Terminal, Minimize2, Maximize2, X, CircleAlert, CircuitBoard as CircuitBoardIcon, Cpu } from 'lucide-react'

const PIN_CONFIG = {
  digital: Array.from({ length: 14 }, (_, i) => i),
  analog: Array.from({ length: 6 }, (_, i) => i),
  pwm: [3, 5, 6, 9, 10, 11],
}

export function ArduinoSimulator() {
  const {
    pins,
    serialOutput,
    isRunning,
    setPinMode,
    digitalWrite,
    analogWrite,
    serialPrint,
    reset,
    setRunning,
  } = useArduinoSimulatorStore()
  const code = useCodeEditorStore((s) => s.code)

  const [isMaximized, setIsMaximized] = useState(false)
  const [selectedPin, setSelectedPin] = useState<number | null>(null)
  const [view, setView] = useState<'board' | 'circuit'>('circuit')
  const runnerRef = useRef<ArduinoRunner | null>(null)
  const serialBatchRef = useRef<string>('')
  const serialFlushRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ---- kumpulan output serial (batch agar tidak berlebihan render) ---- */
  const flushSerial = () => {
    const batch = serialBatchRef.current
    if (!batch) return
    serialBatchRef.current = ''
    serialPrint(batch)
    if (serialFlushRef.current) { clearTimeout(serialFlushRef.current); serialFlushRef.current = null }
  }
  const queueSerial = (text: string) => {
    serialBatchRef.current += text
    if (serialBatchRef.current.includes('\n') && !serialFlushRef.current) {
      serialFlushRef.current = setTimeout(() => {
        serialFlushRef.current = null
        flushSerial()
      }, 100)
    }
  }

  /* ---- hooks simulator → interpreter ---- */
  const buildHooks = () => {
    const store = useArduinoSimulatorStore.getState()
    const analogBase = { t0: Date.now() }
    return {
      pinMode: (pin: number, mode: PinModeName) => store.setPinMode(pin, mode),
      digitalWrite: (pin: number, value: number) => store.digitalWrite(pin, value),
      digitalRead: (pin: number) => {
        const s = useArduinoSimulatorStore.getState()
        const p = s.pins[pin]
        if (!p) return 0
        return p.value ?? 0
      },
      analogWrite: (pin: number, value: number) => store.analogWrite(pin, value),
      analogRead: (pin: number) => {
        const s = useArduinoSimulatorStore.getState()
        const p = s.pins[pin]
        // sensor "hidup": nilai berosilasi pelan (dapat ditimpa manual via slider)
        const wander = Math.round(512 + 380 * Math.sin((Date.now() - analogBase.t0) / 2100 + (pin - 14)) + (Math.random() * 24 - 12))
        return p?.value !== undefined ? p.value : Math.max(0, Math.min(1023, wander))
      },
      serialOut: (text: string) => queueSerial(text),
      onError: (message: string) => {
        flushSerial()
        store.setRunning(false)
        queueSerial(`⛔ [Error Simulator] ${message}\n`)
        setTimeout(() => flushSerial(), 50)
      },
      onFinish: () => {
        flushSerial()
        useArduinoSimulatorStore.getState().setRunning(false)
      },
    } as const
  }

  const stopRunner = () => {
    runnerRef.current?.stop()
    runnerRef.current = null
    if (serialFlushRef.current) { clearTimeout(serialFlushRef.current); serialFlushRef.current = null }
    serialBatchRef.current = ''
  }

  const handleRun = () => {
    stopRunner()
    reset()
    const runner = new ArduinoRunner(code, buildHooks())
    runnerRef.current = runner
    setRunning(true)
    void runner.run()
  }
  const handlePause = () => {
    // pause = hentikan siklus (pin dipertahankan)
    stopRunner()
    setRunning(false)
    flushSerial()
  }
  const handleStop = () => {
    stopRunner()
    setRunning(false)
    reset()
  }
  const handleReset = () => {
    stopRunner()
    setRunning(false)
    reset()
  }

  // stop bersih saat komponen dibongkar
  useEffect(() => stopRunner, [])

  const getPinClass = (pin: number) => {
    const pinData = pins[pin]
    if (!pinData) return 'pin-inactive'
    if (pinData.mode === 'OUTPUT') {
      return (pinData.value ?? 0) === 0 ? 'pin-low' : 'pin-high'
    }
    if (pinData.mode === 'INPUT_PULLUP') return (pinData.value ?? 1) === 0 ? 'pin-low' : 'pin-input'
    return (pinData.value ?? 0) === 0 ? 'pin-inactive' : 'pin-input'
  }

  const getPinLabel = (pin: number) => {
    const specialPins: Record<number, string> = {
      0: 'RX', 1: 'TX', 2: 'INT0', 3: 'PWM/INT1',
      4: '', 5: 'PWM', 6: 'PWM', 7: '',
      8: '', 9: 'PWM', 10: 'PWM/SS', 11: 'PWM/MOSI',
      12: 'MISO', 13: 'LED/SCK',
    }
    return specialPins[pin] || ''
  }

  const isDigitalControlDisabled = isRunning

  return (
    <div
      className={cn(
        'bg-[#0d1117] border border-gray-800 rounded-xl flex flex-col',
        isMaximized && 'fixed inset-4 z-50'
      )}
    >
      <div className="flex items-center justify-between p-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-white">Arduino UNO Simulator</span>
          <span
            className={cn(
              'px-2 py-0.5 rounded text-xs font-medium',
              isRunning ? 'bg-[#00AA55]/20 text-[#00AA55]' : 'bg-[#FF3333]/20 text-[#FF3333]'
            )}
          >
            {isRunning ? 'Running' : 'Stopped'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Toggle Papan / Rangkaian */}
          <div className="flex items-center rounded-lg bg-gray-800/60 p-0.5 mr-1">
            <button
              onClick={() => setView('board')}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors',
                view === 'board' ? 'bg-[#00979D] text-white' : 'text-gray-400 hover:text-white'
              )}
              title="Tampilan papan Arduino"
            >
              <Cpu className="w-3.5 h-3.5" /> Papan
            </button>
            <button
              onClick={() => setView('circuit')}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors',
                view === 'circuit' ? 'bg-[#00979D] text-white' : 'text-gray-400 hover:text-white'
              )}
              title="Rangkaian komponen (LED/Tombol/Pot/Buzzer)"
            >
              <CircuitBoardIcon className="w-3.5 h-3.5" /> Rangkaian
            </button>
          </div>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/60 rounded-lg transition-colors"
            title={isMaximized ? 'Kecilkan' : 'Perluas'}
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        {view === 'board' ? (
          /* Visual Papan Arduino */
          <div className="flex-1 flex items-center justify-center relative min-h-0">
          <div className="relative w-full max-w-2xl aspect-[2/1]">
            <div className="absolute inset-0 bg-green-900/30 rounded-lg border-4 border-green-700/50" />

            {/* Port USB */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-4 h-6 bg-gray-300 rounded-l" />
            {/* Power Jack */}
            <div className="absolute left-0 bottom-2 -translate-x-2 w-4 h-6 bg-gray-300 rounded-l" />
            {/* Tombol Reset */}
            <div className="absolute right-4 top-4 w-3 h-3 bg-gray-600 rounded" />
            {/* ICSP Header */}
            <div className="absolute right-4 bottom-4 w-8 h-4 bg-gray-600 rounded grid grid-cols-3 gap-0.5 p-0.5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-1 h-1 bg-yellow-400 rounded" />
              ))}
            </div>

            {/* Pin Digital — sisi kanan */}
            <div className="absolute right-0 top-4 bottom-4 w-16 flex flex-col justify-between items-end pr-2">
              {PIN_CONFIG.digital.slice().reverse().map((pin) => (
                <PinIndicator
                  key={pin}
                  pin={pin}
                  label={getPinLabel(pin)}
                  className={getPinClass(pin)}
                  onClick={() => setSelectedPin(pin)}
                  isSelected={selectedPin === pin}
                  isPWM={PIN_CONFIG.pwm.includes(pin)}
                />
              ))}
            </div>

            {/* Pin Analog — kiri bawah */}
            <div className="absolute bottom-0 left-12 right-12 h-12 flex justify-between items-start pb-2">
              {PIN_CONFIG.analog.map((i) => (
                <PinIndicator
                  key={`A${i}`}
                  pin={14 + i}
                  label={`A${i}`}
                  className={getPinClass(14 + i)}
                  onClick={() => setSelectedPin(14 + i)}
                  isSelected={selectedPin === 14 + i}
                  isAnalog
                />
              ))}
            </div>

            {/* Pin Daya — bawah */}
            <div className="absolute bottom-0 left-12 right-12 h-8 flex justify-between items-end pb-1">
              {['VIN', 'GND', 'GND', '5V', '3.3V', 'RST', 'GND', 'GND'].map((label, i) => (
                <div
                  key={`${label}-${i}`}
                  className={cn(
                    'w-8 h-6 flex flex-col items-center justify-center text-xs',
                    label === '5V' && 'text-[#FF3333]',
                    label === '3.3V' && 'text-[#FF6B00]',
                    label.includes('GND') && 'text-gray-400',
                    label === 'VIN' && 'text-[#0066CC]',
                    label === 'RST' && 'text-[#FF6B00]'
                  )}
                >
                  <span>{label}</span>
                  <div className={cn('w-2 h-2 rounded mt-1', label.includes('GND') ? 'bg-gray-600' : 'bg-gray-700')} />
                </div>
              ))}
            </div>

            {/* Label chip */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center opacity-30">
                <p className="text-xs font-mono text-gray-500">ATmega328P</p>
                <p className="text-[10px] text-gray-600">Arduino UNO R3</p>
              </div>
            </div>
          </div>
        </div>
        ) : (
          /* Rangkaian komponen ala Tinkercad-lite */
          <div className="flex-1 min-h-0 flex flex-col rounded-xl overflow-hidden border border-gray-800">
            <CircuitBoard />
          </div>
        )}

        {/* Panel Detail Pin */}
        {view === 'board' && selectedPin !== null && (
          <div className="mt-4 p-3 bg-[#161b22] rounded-xl border border-gray-800 animate-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-white">
                Pin {selectedPin >= 14 ? `A${selectedPin - 14}` : selectedPin} {selectedPin < 14 && getPinLabel(selectedPin) ? `(${getPinLabel(selectedPin)})` : ''}
              </h4>
              <button onClick={() => setSelectedPin(null)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <PinModeSelector
                pin={selectedPin}
                currentMode={pins[selectedPin]?.mode || 'INPUT'}
                onChange={(mode) => setPinMode(selectedPin, mode)}
                disabled={isRunning}
              />
              {selectedPin >= 14 ? (
                <AnalogInputControl
                  pin={selectedPin}
                  value={pins[selectedPin]?.value ?? analogHint(selectedPin)}
                  onChange={(val) => analogWrite(selectedPin, val)}
                />
              ) : pins[selectedPin]?.mode === 'OUTPUT' ? (
                <DigitalControl
                  pin={selectedPin}
                  value={pins[selectedPin]?.value ?? 0}
                  onChange={(val) => digitalWrite(selectedPin, val)}
                  disabled={isDigitalControlDisabled}
                />
              ) : (
                <DigitalControl
                  pin={selectedPin}
                  value={pins[selectedPin]?.value ?? 0}
                  onChange={(val) => {
                    digitalWrite(selectedPin, val)
                    setPinMode(selectedPin, pins[selectedPin]?.mode || 'INPUT')
                  }}
                  disabled={false}
                  hint={pins[selectedPin]?.mode === 'INPUT_PULLUP' ? 'Tarik ke GND untuk LOW (pull-up)' : 'Simulasi saklar/tombol'}
                />
              )}
              {PIN_CONFIG.pwm.includes(selectedPin) && pins[selectedPin]?.mode === 'OUTPUT' && (
                <PWMControl
                  pin={selectedPin}
                  value={pins[selectedPin]?.value ?? 0}
                  onChange={(val) => analogWrite(selectedPin, val)}
                  disabled={isDigitalControlDisabled}
                />
              )}
            </div>
            {isRunning && selectedPin < 14 && pins[selectedPin]?.mode === 'OUTPUT' && (
              <p className="text-xs text-gray-500 mt-2">Pin OUTPUT dikendalikan kode saat running — hentikan (Stop) untuk mengatur manual.</p>
            )}
          </div>
        )}

        {/* Kontrol */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-800">
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#0066CC] to-[#00AA55] text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#0066CC]/25"
          >
            <Play className="w-4 h-4" />
            Jalankan Kode
          </button>
          <button
            onClick={handlePause}
            disabled={!isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00]/20 text-[#FF6B00] rounded-xl hover:bg-[#FF6B00]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Pause className="w-4 h-4" />
            Jeda
          </button>
          <button
            onClick={handleStop}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF3333]/20 text-[#FF3333] rounded-xl hover:bg-[#FF3333]/30 transition-colors"
          >
            <Square className="w-4 h-4" />
            Berhenti
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800/60 text-gray-300 rounded-xl hover:bg-gray-800 transition-colors ml-auto"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>

        {/* Serial Monitor */}
        <div className="mt-4 flex-1 min-h-[150px] max-h-[200px] bg-[#00000030] rounded-xl border border-gray-800 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-2 border-b border-gray-800 bg-[#161b22]/50">
            <span className="text-sm font-medium text-gray-300 flex items-center gap-1">
              <Terminal className="w-3 h-3" />
              Serial Monitor (9600 baud)
            </span>
            <button
              onClick={() => reset()}
              className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-gray-800/60 transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 font-mono text-xs" style={{ fontFamily: 'monospace' }}>
            {serialOutput.length === 0 ? (
              <div className="text-gray-500 text-center h-full flex items-center justify-center">
                Tekan &quot;Jalankan Kode&quot; — kode kamu dieksekusi sungguhan
              </div>
            ) : (
              <div className="space-y-0.5">
                {serialOutput.map((line, i) => (
                  <div key={i} className={cn('text-left whitespace-pre-wrap', line.startsWith('⛔') ? 'text-[#FF3333] flex items-start gap-1' : 'text-[#00AA55]')}>
                    {line.startsWith('⛔') && <CircleAlert className="w-3 h-3 mt-0.5 shrink-0" />}
                    {line.startsWith('⛔') ? line.replace('⛔ ', '') : line}
                  </div>
                ))}
              </div>
            )}
          </div>
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

function analogHint(pin: number) {
  // nilai "sensor" bergerak — cukup untuk indikator awal slider
  return Math.round(512 + 380 * Math.sin(Date.now() / 2100 + (pin - 14)))
}

interface PinIndicatorProps {
  pin: number
  label: string
  className: string
  onClick: () => void
  isSelected: boolean
  isPWM?: boolean
  isAnalog?: boolean
}

function PinIndicator({ pin, label, className, onClick, isSelected, isPWM, isAnalog }: PinIndicatorProps) {
  const baseClasses = 'w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono cursor-pointer transition-all'
  const colorClasses: Record<string, string> = {
    'pin-inactive': 'bg-gray-700 text-gray-500 border border-gray-600',
    'pin-high': 'bg-[#00AA55] text-white border border-[#00AA55]/50 shadow-[0_0_8px_rgba(0,170,85,0.6)]',
    'pin-low': 'bg-gray-600 text-gray-300 border border-gray-500',
    'pin-input': 'bg-[#0066CC]/20 text-[#0066CC] border border-[#0066CC]/30',
  }

  return (
    <div className="flex items-center gap-1 group">
      <button
        onClick={onClick}
        className={cn(
          baseClasses,
          colorClasses[className] || colorClasses['pin-inactive'],
          isSelected && 'ring-2 ring-[#0066CC] ring-offset-2 ring-offset-[#0d1117] scale-110 z-10'
        )}
        title={`Pin ${isAnalog ? 'A' + (pin - 14) : pin}${label ? ` - ${label}` : ''}${isPWM ? ' (PWM)' : ''}`}
      >
        {className === 'pin-high' ? '1' : className === 'pin-low' ? '0' : isAnalog ? (pin - 14).toString() : pin.toString()}
      </button>
      {label && <span className="text-[10px] text-gray-500 whitespace-nowrap">{label}</span>}
    </div>
  )
}

interface PinModeSelectorProps {
  pin: number
  currentMode: 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP'
  onChange: (mode: 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP') => void
  disabled?: boolean
}

function PinModeSelector({ pin, currentMode, onChange, disabled }: PinModeSelectorProps) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">
        Mode {pin >= 14 ? `(A${pin - 14})` : ''}
      </label>
      <select
        value={currentMode}
        onChange={(e) => onChange(e.target.value as PinModeName)}
        disabled={disabled}
        className="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#0066CC] appearance-none disabled:opacity-50"
      >
        <option value="INPUT">INPUT</option>
        <option value="OUTPUT">OUTPUT</option>
        <option value="INPUT_PULLUP">INPUT_PULLUP</option>
      </select>
    </div>
  )
}

interface DigitalControlProps {
  pin: number
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  hint?: string
}

function DigitalControl({ value, onChange, disabled, hint }: DigitalControlProps) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">Digital {hint && <span className="text-gray-600">— {hint}</span>}</label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(0)}
          disabled={disabled}
          className={cn(
            'flex-1 py-2 rounded-lg font-medium text-xs transition-colors disabled:opacity-50',
            value === 0 ? 'bg-[#FF3333]/20 text-[#FF3333] border border-[#FF3333]/30' : 'bg-gray-800/60 text-gray-500 border border-gray-600 hover:border-gray-500'
          )}
        >
          LOW (0)
        </button>
        <button
          onClick={() => onChange(1)}
          disabled={disabled}
          className={cn(
            'flex-1 py-2 rounded-lg font-medium text-xs transition-colors disabled:opacity-50',
            value === 1 ? 'bg-[#00AA55]/20 text-[#00AA55] border border-[#00AA55]/30' : 'bg-gray-800/60 text-gray-500 border border-gray-600 hover:border-gray-500'
          )}
        >
          HIGH (1)
        </button>
      </div>
    </div>
  )
}

interface PWMControlProps {
  pin: number
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

function PWMControl({ value, onChange, disabled }: PWMControlProps) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">PWM (0-255)</label>
      <input
        type="range"
        min="0"
        max="255"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 bg-gray-700/60 rounded-lg appearance-none cursor-pointer accent-[#0066CC] disabled:opacity-50"
      />
      <div className="flex justify-between text-[10px] text-gray-500 mt-1">
        <span>0</span>
        <span>{value}</span>
        <span>255</span>
      </div>
    </div>
  )
}

interface AnalogInputControlProps {
  pin: number
  value: number
  onChange: (value: number) => void
}

function AnalogInputControl({ value, onChange }: AnalogInputControlProps) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">Sensor / analogRead (0-1023)</label>
      <input
        type="range"
        min="0"
        max="1023"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 bg-gray-700/60 rounded-lg appearance-none cursor-pointer accent-[#00AA55]"
      />
      <div className="flex justify-between text-[10px] text-gray-500 mt-1">
        <span>0</span>
        <span>{value}</span>
        <span>1023</span>
      </div>
    </div>
  )
}
