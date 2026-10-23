'use client'

import { useState, useCallback, useRef } from 'react'
import { compile } from 'browsercc'
import { WASI, ConsoleStdout } from '@bjorn3/browser_wasi_shim'

interface ExecutionResult {
  output: string
  error: string
  executionTime: number
  memoryUsed: number
}

interface UseCExecutionReturn {
  execute: (code: string, stdin?: string) => Promise<ExecutionResult>
  isCompiling: boolean
  isRunning: boolean
  compileError: string | null
  cancel: () => void
}

const DEFAULT_FLAGS = [
  '-O2',
  '-std=c11',
  '-Wno-unused-command-line-argument',
  '-Wno-unused-variable',
  '-Wno-unused-function',
]

// Configure browsercc to load WASM from public/toolchain
if (typeof window !== 'undefined') {
  const w = window as unknown as { __BROWSERCC_CONFIG__?: unknown }
  w.__BROWSERCC_CONFIG__ = {
    clang: {
      wasmUrl: '/toolchain/clang.wasm',
      jsUrl: '/toolchain/clang.js',
    },
    lld: {
      wasmUrl: '/toolchain/lld.wasm',
      jsUrl: '/toolchain/lld.js',
    },
    sysroot: {
      url: '/toolchain/sysroot.tar',
    },
  }
}

export function useCExecution(): UseCExecutionReturn {
  const [isCompiling, setIsCompiling] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [compileError, setCompileError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsCompiling(false)
    setIsRunning(false)
  }, [])

  const execute = useCallback(async (code: string, stdin = ''): Promise<ExecutionResult> => {
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal
    
    setIsCompiling(true)
    setCompileError(null)
    const startTime = performance.now()

    try {
      // Compile C code to WASM
      const result = await compile({
        source: code,
        fileName: 'main.c',
        flags: DEFAULT_FLAGS,
      })

      if (signal.aborted) throw new Error('Cancelled')

      if (!result.module) {
        setCompileError(result.compileOutput || 'Compilation failed')
        return {
          output: '',
          error: result.compileOutput || 'Compilation failed',
          executionTime: performance.now() - startTime,
          memoryUsed: 0,
        }
      }

      setIsCompiling(false)
      setIsRunning(true)

      // Run the compiled WASM with WASI shim
      const outputBuffer: string[] = []
      const errorBuffer: string[] = []

      // Create stdout/stderr file descriptors
      const stdoutFd = new ConsoleStdout((data: Uint8Array) => {
        outputBuffer.push(new TextDecoder().decode(data))
      })
      const stderrFd = new ConsoleStdout((data: Uint8Array) => {
        errorBuffer.push(new TextDecoder().decode(data))
      })

      const wasi = new WASI(
        ['main'],
        [],
        [
          /* stdin */ stdoutFd, // stdin fd 0 - using stdoutFd as placeholder
          stdoutFd, // stdout fd 1
          stderrFd, // stderr fd 2
        ],
        { debug: false }
      )

      if (signal.aborted) throw new Error('Cancelled')

      // Initialize and start the instance
      const instance = await WebAssembly.instantiate(result.module, { wasi_snapshot_preview1: wasi.wasiImport })
      const exp = instance.exports as unknown as { memory: WebAssembly.Memory; _start: () => unknown }
      wasi.initialize({ exports: { memory: exp.memory } })
      await wasi.start({ exports: { memory: exp.memory, _start: exp._start } })

      if (signal.aborted) throw new Error('Cancelled')

      const executionTime = performance.now() - startTime
      const memoryUsed = Math.round((instance.exports.memory as WebAssembly.Memory)?.buffer?.byteLength / 1024 || 0)

      return {
        output: outputBuffer.join(''),
        error: errorBuffer.join(''),
        executionTime: Math.round(executionTime),
        memoryUsed,
      }
    } catch (err) {
      if (signal.aborted) {
        return {
          output: '',
          error: 'Execution cancelled',
          executionTime: Math.round(performance.now() - startTime),
          memoryUsed: 0,
        }
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setCompileError(errorMessage)
      
      return {
        output: '',
        error: errorMessage,
        executionTime: Math.round(performance.now() - startTime),
        memoryUsed: 0,
      }
    } finally {
      setIsCompiling(false)
      setIsRunning(false)
    }
  }, [])

  return {
    execute,
    isCompiling,
    isRunning,
    compileError,
    cancel,
  }
}