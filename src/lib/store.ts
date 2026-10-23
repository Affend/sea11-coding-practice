'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MODULES, type ModuleKey, type Topic } from '@/lib/utils'

interface CodeEditorState {
  code: string
  language: 'c' | 'cpp'
  theme: 'vs-dark' | 'vs-light' | 'hc-black'
  fontSize: number
  setCode: (code: string) => void
  setLanguage: (lang: 'c' | 'cpp') => void
  setTheme: (theme: 'vs-dark' | 'vs-light' | 'hc-black') => void
  setFontSize: (size: number) => void
}

export const useCodeEditorStore = create<CodeEditorState>()(
  persist(
    (set) => ({
      code: '',
      language: 'c',
      theme: 'vs-dark',
      fontSize: 14,
      setCode: (code) => set({ code }),
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
    }),
    { name: 'code-editor-settings' }
  )
)

interface ExecutionState {
  output: string
  error: string
  isRunning: boolean
  executionTime: number
  memoryUsed: number
  setOutput: (output: string) => void
  setError: (error: string) => void
  setRunning: (running: boolean) => void
  setExecutionTime: (time: number) => void
  setMemoryUsed: (memory: number) => void
  clear: () => void
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  output: '',
  error: '',
  isRunning: false,
  executionTime: 0,
  memoryUsed: 0,
  setOutput: (output) => set({ output }),
  setError: (error) => set({ error }),
  setRunning: (isRunning) => set({ isRunning }),
  setExecutionTime: (executionTime) => set({ executionTime }),
  setMemoryUsed: (memoryUsed) => set({ memoryUsed }),
  clear: () => set({ output: '', error: '', executionTime: 0, memoryUsed: 0 }),
}))

interface ModuleProgress {
  [moduleId: string]: {
    completedTopics: string[]
    currentTopic: string | null
    xp: number
    streak: number
    lastActive: string
  }
}

interface LearningState {
  currentModule: ModuleKey | null
  currentTopic: Topic | null
  progress: ModuleProgress
  totalXP: number
  setCurrentModule: (module: ModuleKey) => void
  setCurrentTopic: (topic: Topic | null) => void
  completeTopic: (moduleId: ModuleKey, topicId: string) => void
  addXP: (amount: number) => void
  updateStreak: () => void
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      currentModule: null,
      currentTopic: null,
      progress: {},
      totalXP: 0,
      setCurrentModule: (module) => set({ currentModule: module, currentTopic: null }),
      setCurrentTopic: (topic) => set({ currentTopic: topic }),
      completeTopic: (moduleId, topicId) =>
        set((state) => {
          const moduleProgress = state.progress[moduleId] || { completedTopics: [], currentTopic: null, xp: 0, streak: 0, lastActive: new Date().toISOString() }
          if (!moduleProgress.completedTopics.includes(topicId)) {
            moduleProgress.completedTopics.push(topicId)
            moduleProgress.xp += 100
            moduleProgress.lastActive = new Date().toISOString()
          }
          return {
            progress: { ...state.progress, [moduleId]: moduleProgress },
            totalXP: state.totalXP + 100,
          }
        }),
      addXP: (amount) => set((state) => ({ totalXP: state.totalXP + amount })),
      updateStreak: () =>
        set((state) => {
          const today = new Date().toDateString()
          Object.keys(state.progress).forEach((moduleId) => {
            const lastActive = new Date(state.progress[moduleId].lastActive).toDateString()
            if (lastActive !== today) {
              state.progress[moduleId].streak += 1
              state.progress[moduleId].lastActive = new Date().toISOString()
            }
          })
          return { progress: { ...state.progress } }
        }),
    }),
    { name: 'learning-progress' }
  )
)

interface UIState {
  sidebarOpen: boolean
  consoleOpen: boolean
  consoleHeight: number
  splitRatio: number
  toggleSidebar: () => void
  toggleConsole: () => void
  setConsoleHeight: (height: number) => void
  setSplitRatio: (ratio: number) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      consoleOpen: true,
      consoleHeight: 200,
      splitRatio: 50,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleConsole: () => set((state) => ({ consoleOpen: !state.consoleOpen })),
      setConsoleHeight: (consoleHeight) => set({ consoleHeight }),
      setSplitRatio: (splitRatio) => set({ splitRatio }),
    }),
    { name: 'ui-settings' }
  )
)

/* --- komponen rangkaian ala Tinkercad-lite --- */

export type ComponentType = 'led' | 'button' | 'pot' | 'buzzer'

export interface CircuitComponent {
  id: string
  type: ComponentType
  pin: number // 0-13 digital; 14-19 = A0-A5
  color?: string // untuk LED
}

type ButtonModal = 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP'

interface ArduinoSimulatorState {
  pins: { [pin: number]: { mode: ButtonModal; value: number } }
  serialOutput: string[]
  serialInput: string
  isRunning: boolean
  variables: { [name: string]: unknown }
  /** komponen yang tempel di rangkaian (mode uji: dibersihkan saat reset) */
  components: CircuitComponent[]
  setPinMode: (pin: number, mode: ButtonModal) => void
  digitalWrite: (pin: number, value: number) => void
  digitalRead: (pin: number) => number
  analogWrite: (pin: number, value: number) => void
  analogRead: (pin: number) => number
  serialPrint: (data: string) => void
  serialRead: () => string
  setSerialInput: (text: string) => void
  setVariable: (name: string, value: unknown) => void
  getVariable: (name: string) => unknown
  addComponent: (type: ComponentType, pin: number) => void
  removeComponent: (id: string) => void
  reset: () => void
  setRunning: (running: boolean) => void
}

export const useArduinoSimulatorStore = create<ArduinoSimulatorState>((set, get) => ({
  pins: {},
  serialOutput: [],
  serialInput: '',
  isRunning: false,
  variables: {},
  components: [],
  setPinMode: (pin, mode) =>
    set((state) => ({
      pins: { ...state.pins, [pin]: { ...state.pins[pin], mode } },
    })),
  digitalWrite: (pin, value) =>
    set((state) => ({
      pins: { ...state.pins, [pin]: { ...state.pins[pin], value } },
    })),
  digitalRead: (pin) => get().pins[pin]?.value || 0,
  analogWrite: (pin, value) =>
    set((state) => ({
      pins: { ...state.pins, [pin]: { ...state.pins[pin], value } },
    })),
  analogRead: (pin) => get().pins[pin]?.value || 0,
  serialPrint: (data) =>
    set((state) => ({
      serialOutput: [...state.serialOutput, data],
    })),
  serialRead: () => get().serialInput,
  setSerialInput: (text) => set({ serialInput: text }),
  setVariable: (name, value) =>
    set((state) => ({
      variables: { ...state.variables, [name]: value },
    })),
  getVariable: (name) => get().variables[name],
  addComponent: (type, pin) =>
    set((state) => {
      if (state.components.some((c) => c.pin === pin)) return state // 1 komponen per pin
      const id = `${type}-${pin}-${Date.now().toString(36)}`
      const color = type === 'led' ? '#FF3333' : undefined
      return { components: [...state.components, { id, type, pin, color }] }
    }),
  removeComponent: (id) =>
    set((state) => ({ components: state.components.filter((c) => c.id !== id) })),
  reset: () =>
    set({ pins: {}, serialOutput: [], serialInput: '', variables: {} }),
  setRunning: (isRunning) => set({ isRunning }),
}))

/* ============ Sistem Ujian & Anti-Cheat ============ */

export interface ExamParticipant {
  id: number
  name: string
  nim: string
  kelas: string
}

export interface ActiveExamSession {
  sessionId: number
  module: string
  topic: string
  startedAt: string
}

export interface ExamViolationCounters {
  info: number
  warning: number
  danger: number
}

interface ExamState {
  participant: ExamParticipant | null
  session: ActiveExamSession | null
  violations: ExamViolationCounters
  lastEventDetail: { type: string; severity: string; at: number } | null
  setParticipant: (participant: ExamParticipant | null) => void
  startSession: (session: ActiveExamSession) => void
  clearSession: () => void
  recordViolation: (severity: 'info' | 'warning' | 'danger', type: string) => void
  resetViolations: () => void
}

export const useExamStore = create<ExamState>()(
  persist(
    (set, get) => ({
      participant: null,
      session: null,
      violations: { info: 0, warning: 0, danger: 0 },
      lastEventDetail: null,
      setParticipant: (participant) => set({ participant }),
      startSession: (session) =>
        set({ session, violations: { info: 0, warning: 0, danger: 0 }, lastEventDetail: null }),
      clearSession: () => set({ session: null, violations: { info: 0, warning: 0, danger: 0 }, lastEventDetail: null }),
      recordViolation: (severity, type) => {
        const v = get().violations
        set({
          violations: { ...v, [severity]: v[severity] + 1 },
          lastEventDetail: { type, severity, at: Date.now() },
        })
      },
      resetViolations: () => set({ violations: { info: 0, warning: 0, danger: 0 } }),
    }),
    { name: 'exam-session' }
  )
)