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

interface ArduinoSimulatorState {
  pins: { [pin: number]: { mode: 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP'; value: number } }
  serialOutput: string[]
  serialInput: string
  isRunning: boolean
  variables: { [name: string]: any }
  setPinMode: (pin: number, mode: 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP') => void
  digitalWrite: (pin: number, value: number) => void
  digitalRead: (pin: number) => number
  analogWrite: (pin: number, value: number) => void
  analogRead: (pin: number) => number
  serialPrint: (data: string) => void
  serialRead: () => string
  setVariable: (name: string, value: any) => void
  getVariable: (name: string) => any
  reset: () => void
  setRunning: (running: boolean) => void
}

export const useArduinoSimulatorStore = create<ArduinoSimulatorState>((set, get) => ({
  pins: {},
  serialOutput: [],
  serialInput: '',
  isRunning: false,
  variables: {},
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
  setVariable: (name, value) =>
    set((state) => ({
      variables: { ...state.variables, [name]: value },
    })),
  getVariable: (name) => get().variables[name],
  reset: () => set({ pins: {}, serialOutput: [], serialInput: '', variables: {} }),
  setRunning: (isRunning) => set({ isRunning }),
}))