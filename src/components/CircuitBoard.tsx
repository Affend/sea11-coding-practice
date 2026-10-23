'use client'

/**
 * CircuitBoard — rangkaian visual ala Tinkercad-lite:
 * - Tempel komponen (LED / Push Button / Potensiometer / Buzzer) ke pin tertentu.
 * - LED menyala mengikuti digitalWrite (termasuk PWM), Button + Pot
 *   dibaca kode via digitalRead / analogRead, Buzzer berbunyi saat pin HIGH.
 * - Menempel pin manual juga masih bisa lewat panel detail pin di simulator.
 */
import React, { useEffect, useRef, useState } from 'react'
import { useArduinoSimulatorStore, type ComponentType, type CircuitComponent } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Lightbulb, ToggleLeft, AudioLines, Gauge, Plus, Trash2, Volume2, Circle } from 'lucide-react'

const ANIMAL_A = 14 // A0 diwakili pin 14

const CANVAS_W = 780
const CANVAS_H = 470
const BOARD_X = 30
const BOARD_Y = 60
const BOARD_W = 190
const BOARD_H = 230

const DIGITAL_PIN_POS = (pin: number) => ({
  x: BOARD_X + BOARD_W,
  y: BOARD_Y + 16 + pin * 15.4,
})
const ANALOG_PIN_POS = (idx: number) => ({
  x: BOARD_X + 34 + idx * 25,
  y: BOARD_Y + BOARD_H,
})

/** posisi kartu komponen berdasarkan urutan render */
const compPos = (index: number) => ({
  x: 300 + (index % 3) * 152,
  y: 14 + Math.floor(index / 3) * 145,
})

const COMP_META: Record<ComponentType, { label: string; desc: string; icon: React.ReactNode; kinds: 'digital' | 'analog' }> = {
  led: { label: 'LED', desc: 'digitalWrite/pinMode OUTPUT', icon: <Lightbulb className="w-3.5 h-3.5" />, kinds: 'digital' },
  button: { label: 'Tombol', desc: 'digitalRead — tahan untuk HIGH', icon: <ToggleLeft className="w-3.5 h-3.5" />, kinds: 'digital' },
  pot: { label: 'Potensiometer', desc: 'analogRead 0–1023', icon: <Gauge className="w-3.5 h-3.5" />, kinds: 'analog' },
  buzzer: { label: 'Buzzer', desc: 'HIGH = berbunyi', icon: <AudioLines className="w-3.5 h-3.5" />, kinds: 'digital' },
}

export function CircuitBoard() {
  const { components, addComponent, removeComponent } = useArduinoSimulatorStore()
  const [pickType, setPickType] = useState<ComponentType>('led')
  const [pickPin, setPickPin] = useState(13)
  const [pickAnalog, setPickAnalog] = useState(0) // idx A0..A5 untuk pot
  const validKinds = COMP_META[pickType].kinds === 'analog'

  const doAdd = () => {
    const pin = validKinds ? ANIMAL_A + pickAnalog : pickPin
    addComponent(pickType, pin)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Palette */}
      <div className="flex items-center gap-2 flex-wrap p-2 border-b border-gray-800 bg-[#161b22]/40">
        {(Object.keys(COMP_META) as ComponentType[]).map((t) => (
          <button
            key={t}
            onClick={() => setPickType(t)}
            title={COMP_META[t].desc}
            className={cn(
              'px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors',
              pickType === t ? 'bg-[#00979D] text-white' : 'bg-gray-800/60 text-gray-300 hover:bg-gray-800'
            )}
          >
            {COMP_META[t].icon}
            {COMP_META[t].label}
          </button>
        ))}

        {validKinds ? (
          <select
            value={pickAnalog}
            onChange={(e) => setPickAnalog(Number(e.target.value))}
            className="bg-gray-800/60 border border-gray-700/50 rounded-lg px-2 py-1 text-xs text-white appearance-none"
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <option key={i} value={i}>A{i}</option>
            ))}
          </select>
        ) : (
          <select
            value={pickPin}
            onChange={(e) => setPickPin(Number(e.target.value))}
            className="bg-gray-800/60 border border-gray-700/50 rounded-lg px-2 py-1 text-xs text-white appearance-none"
          >
            {Array.from({ length: 14 }, (_, i) => i).map((p) => (
              <option key={p} value={p}>pin {p}</option>
            ))}
          </select>
        )}

        <button
          onClick={doAdd}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#00AA55] text-white flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Tempel
        </button>

        {pickType === 'led' && (
          <span className="text-[10px] text-gray-500 flex items-center gap-1">
            <Circle className="w-2 h-2 rounded-full bg-[#FF3333]" /> LED memakai warna merah
          </span>
        )}
      </div>

      {/* Kanvas rangkaian */}
      <div className="flex-1 min-h-0 overflow-auto p-2">
        <div className="relative" style={{ width: CANVAS_W, height: CANVAS_H, minHeight: 280 }}>
          {/* papan + kabel (SVG) */}
          <svg width={CANVAS_W} height={CANVAS_H} className="absolute inset-0">
            {/* board */}
            <rect x={BOARD_X} y={BOARD_Y} width={BOARD_W} height={BOARD_H} rx={12} fill="#00979D" stroke="#00666e" strokeWidth="2" />
            <rect x={BOARD_X + 16} y={BOARD_Y + 90} width={BOARD_W - 32} height={40} rx={4} fill="#1b3a3e" />
            <text x={BOARD_X + 20} y={BOARD_Y + 96 + 24} fontSize="11" fill="#8ad7dc" fontFamily="monospace">ATmega328P</text>
            <text x={BOARD_X + 20} y={BOARD_Y + 26} fontSize="12" fill="#dff8fa" fontFamily="monospace" fontWeight="bold">SEA UNO</text>

            {/* USB */}
            <rect x={BOARD_X + 12} y={BOARD_Y - 12} width={40} height={14} rx={3} fill="#b0b8bf" />
            {/* pin digital */}
            {Array.from({ length: 14 }, (_, pin) => {
              const p = DIGITAL_PIN_POS(pin)
              const used = components.some((c) => c.pin === pin)
              return (
                <g key={`d${pin}`}>
                  <rect x={p.x} y={p.y - 4} width={10} height={8} rx={2} fill={used ? '#FFB800' : '#20242a'} stroke="#111" />
                  <text x={p.x - 10} y={p.y + 10} fontSize="9" fill="#8ad7dc" textAnchor="end" fontFamily="monospace">{pin}</text>
                </g>
              )
            })}
            {/* pin analog */}
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const p = ANALOG_PIN_POS(i)
              const pin = ANIMAL_A + i
              const used = components.some((c) => c.pin === pin)
              return (
                <g key={`a${i}`}>
                  <rect x={p.x - 5} y={p.y - 10} width={10} height={10} rx={2} fill={used ? '#FFB800' : '#20242a'} stroke="#111" />
                  <text x={p.x} y={p.y + 14} fontSize="9" fill="#8ad7dc" textAnchor="middle" fontFamily="monospace">A{i}</text>
                </g>
              )
            })}

            {/* kabel */}
            {components.map((c, i) => {
              const pos = compPos(i)
              const from = c.pin >= ANIMAL_A ? ANALOG_PIN_POS(c.pin - ANIMAL_A) : DIGITAL_PIN_POS(c.pin)
              const toX = pos.x + 6
              const toY = pos.y + 28
              const mx = (from.x + toX) / 2
              const d = `M ${from.x + 8} ${from.y} C ${mx} ${from.y}, ${mx} ${toY}, ${toX} ${toY}`
              return <path key={c.id} d={d} stroke="#FFB800" strokeWidth={2} fill="none" opacity={0.5} />
            })}
          </svg>

          {/* kartu komponen (HTML overlay) */}
          {components.map((c, i) => (
            <ComponentCard key={c.id} comp={c} pos={compPos(i)} onRemove={() => removeComponent(c.id)} />
          ))}

          {components.length === 0 && (
            <div className="absolute left-64 top-8 text-xs text-gray-500 bg-[#10151c66] border border-gray-800 rounded-xl p-4 max-w-xs">
              Belum ada komponen. Pilih jenis + pin di atas, lalu <b>Tempel</b>.
              <p className="mt-1 text-gray-600">Contoh latihan Struktur Data: LED di pin 13, tombol di pin 2, potensiometer di A0.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------------- kartu komponen ---------------- */

function ComponentCard({ comp, pos, onRemove }: { comp: CircuitComponent; pos: { x: number; y: number }; onRemove: () => void }) {
  const pinLabel = comp.pin >= ANIMAL_A ? `A${comp.pin - ANIMAL_A}` : String(comp.pin)
  const pinValue = useArduinoSimulatorStore((s) => s.pins[comp.pin]?.value)
  const pinMode = useArduinoSimulatorStore((s) => s.pins[comp.pin]?.mode)
  const digitalWrite = useArduinoSimulatorStore((s) => s.digitalWrite)
  const analogWrite = useArduinoSimulatorStore((s) => s.analogWrite)
  const setPinMode = useArduinoSimulatorStore((s) => s.setPinMode)

  const label = `${COMP_META[comp.type].label} — ${pinLabel}`

  return (
    <div
      className="absolute bg-[#1c2330] border border-gray-700 rounded-xl shadow-lg"
      style={{ left: pos.x, top: pos.y, width: 144, height: 132 }}
    >
      <div className="flex items-center justify-between px-2 pt-1">
        <span className="text-[10px] font-semibold text-gray-300 truncate">{label}</span>
        <button onClick={onRemove} className="text-gray-500 hover:text-[#FF3333]" title="Lepas komponen">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <div className="px-2 pb-2 pt-1">
        {comp.type === 'led' && <LedView value={pinValue ?? 0} color={comp.color || '#FF3333'} />}
        {comp.type === 'button' && (
          <ButtonView onDown={() => { setPinMode(comp.pin, 'INPUT'); digitalWrite(comp.pin, 1) }} onUp={() => digitalWrite(comp.pin, 0)} active={(pinValue ?? 0) === 1} />
        )}
        {comp.type === 'pot' && (
          <PotView value={pinValue ?? 512} onChange={(v) => analogWrite(comp.pin, v)} />
        )}
        {comp.type === 'buzzer' && <BuzzerView active={(pinValue ?? 0) !== 0} pin={comp.pin} />}
        <p className="text-[9px] text-gray-600 mt-1">{COMP_META[comp.type].desc}{pinMode ? ` • mode ${pinMode}` : ''}</p>
      </div>
    </div>
  )
}

function LedView({ value, color }: { value: number; color: string }) {
  // value 0/1 (digital) atau 0-255 (PWM)
  const brightness = Math.max(0, Math.min(1, value / (value <= 1 ? 1 : 255)))
  return (
    <div className="flex items-center justify-center h-10">
      <div
        className="w-9 h-9 rounded-full border-2 transition-all duration-150"
        style={{
          background: brightness > 0.02 ? color : '#111827',
          borderColor: brightness > 0.02 ? color : '#374151',
          opacity: 0.35 + brightness * 0.65,
          boxShadow: brightness > 0.02 ? `0 0 ${4 + brightness * 18}px ${color}` : 'none',
        }}
      />
    </div>
  )
}

function ButtonView({ onDown, onUp, active }: { onDown: () => void; onUp: () => void; active: boolean }) {
  return (
    <div className="flex items-center justify-center h-10">
      <button
        onPointerDown={(e) => { e.preventDefault(); onDown() }}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(
          'px-4 py-2 rounded-lg text-[10px] font-bold transition-all select-none touch-none',
          active
            ? 'bg-[#00AA55] text-white translate-y-[2px] shadow-inner'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        )}
      >
        {active ? 'DITEKAN' : 'Tekan (tahan)'}
      </button>
    </div>
  )
}

function PotView({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="h-10 flex flex-col justify-center">
      <input
        type="range"
        min={0}
        max={1023}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-gray-700 rounded appearance-none cursor-pointer accent-[#00979D]"
      />
      <div className="flex justify-between text-[9px] text-gray-500 font-mono">
        <span>0</span><span>{value}</span><span>1023</span>
      </div>
    </div>
  )
}

/** buzzer berbunyi pakai WebAudio ketika pin HIGH */
function BuzzerView({ active, pin }: { active: boolean; pin: number }) {
  const ctxRef = useRef<AudioContext | null>(null)
  const oscRef = useRef<OscillatorNode | null>(null)

  useEffect(() => {
    if (active) {
      if (!ctxRef.current) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        ctxRef.current = new AC()
      }
      const ctx = ctxRef.current
      if (ctx && !oscRef.current) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'square'
        osc.frequency.value = 440 + pin * 10
        gain.gain.value = 0.03 // pelan agar tidak menggangu ujian
        osc.connect(gain).connect(ctx.destination)
        osc.start()
        oscRef.current = osc
      }
    } else if (oscRef.current) {
      oscRef.current.stop()
      oscRef.current = null
    }
    return () => {
      if (oscRef.current) {
        oscRef.current.stop()
        oscRef.current = null
      }
    }
  }, [active, pin])

  return (
    <div className="flex items-center justify-center h-10">
      <div
        className={cn('w-10 h-10 rounded border-2 flex items-center justify-center transition-colors', active ? 'border-[#FFB800] bg-[#FFB800]/10' : 'border-gray-600 bg-[#111827]')}
      >
        <Volume2 className={cn('w-5 h-5', active ? 'text-[#FFB800] animate-pulse' : 'text-gray-600')} />
      </div>
    </div>
  )
}
