import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const SEA_COLORS = {
  primary: '#0066CC',
  primaryDark: '#004499',
  primaryLight: '#E6F0FA',
  secondary: '#00AA55',
  secondaryDark: '#007733',
  accent: '#FF6B00',
  dark: '#1A1A2E',
  darkCard: '#16213E',
  text: '#FFFFFF',
  textMuted: '#A0A0B0',
  border: '#2A2A4A',
  success: '#00CC66',
  warning: '#FFB800',
  error: '#FF3366',
} as const

export interface Topic {
  id: string
  title: string
  difficulty: 'Pemula' | 'Menengah' | 'Lanjutan'
  estimatedTime: string
}

export interface Module {
  id: string
  name: string
  description: string
  icon: string
  color: string
  topics: Topic[]
}

export const MODULES: Record<string, Module> = {
  c: {
    id: 'c',
    name: 'Algoritma & Pemrograman C',
    description: 'Dasar-dasar pemrograman C: variabel, kontrol aliran, fungsi, array, pointer, struct',
    icon: 'code',
    color: SEA_COLORS.primary,
    topics: [
      { id: 'basics', title: 'Dasar C & Hello World', difficulty: 'Pemula', estimatedTime: '30 menit' },
      { id: 'variables', title: 'Variabel & Tipe Data', difficulty: 'Pemula', estimatedTime: '45 menit' },
      { id: 'control-flow', title: 'Kontrol Aliran (if, switch, loop)', difficulty: 'Pemula', estimatedTime: '60 menit' },
      { id: 'functions', title: 'Fungsi & Rekursi', difficulty: 'Menengah', estimatedTime: '60 menit' },
      { id: 'arrays', title: 'Array & String', difficulty: 'Menengah', estimatedTime: '45 menit' },
      { id: 'pointers', title: 'Pointer & Manajemen Memori', difficulty: 'Menengah', estimatedTime: '90 menit' },
      { id: 'structs', title: 'Struct & Union', difficulty: 'Menengah', estimatedTime: '60 menit' },
      { id: 'file-io', title: 'File I/O', difficulty: 'Lanjutan', estimatedTime: '60 menit' },
    ],
  },
  arduino: {
    id: 'arduino',
    name: 'Struktur Data Arduino UNO',
    description: 'Implementasi struktur data pada Arduino: array, linked list, stack, queue, tree, graph',
    icon: 'cpu',
    color: SEA_COLORS.secondary,
    topics: [
      { id: 'arduino-basics', title: 'Dasar Arduino & Setup', difficulty: 'Pemula', estimatedTime: '30 menit' },
      { id: 'arrays-arduino', title: 'Array & Buffer Sirkuler', difficulty: 'Pemula', estimatedTime: '45 menit' },
      { id: 'linked-list', title: 'Linked List Dinamis', difficulty: 'Menengah', estimatedTime: '60 menit' },
      { id: 'stack-queue', title: 'Stack & Queue', difficulty: 'Menengah', estimatedTime: '60 menit' },
      { id: 'trees', title: 'Binary Tree & BST', difficulty: 'Lanjutan', estimatedTime: '90 menit' },
      { id: 'graphs', title: 'Graph & Pathfinding', difficulty: 'Lanjutan', estimatedTime: '90 menit' },
      { id: 'sorting', title: 'Sorting di Embedded', difficulty: 'Lanjutan', estimatedTime: '60 menit' },
      { id: 'memory-mgmt', title: 'Manajemen Memori Terbatas', difficulty: 'Lanjutan', estimatedTime: '60 menit' },
    ],
  },
}

export type ModuleKey = keyof typeof MODULES