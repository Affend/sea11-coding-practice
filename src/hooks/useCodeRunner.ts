'use client'

/**
 * useCodeRunner — sambungan compiler (browsercc) ke UI:
 *  - run(): jalankan kode di editor, tulis hasil ke konsol
 *  - stop(): batalkan kompilasi/eksekusi
 *  - reset(code): kembalikan editor ke starter code
 *  - Ctrl+Enter terpasang otomatis saat halaman terbuka
 */
import { useCallback, useEffect } from 'react'
import { useCodeEditorStore, useExecutionStore } from '@/lib/store'
import { useCExecution } from './useCExecution'

export function useCodeRunner() {
  const { execute, cancel, isCompiling } = useCExecution()

  const run = useCallback(async () => {
    useExecutionStore.getState().clear()
    useExecutionStore.getState().setRunning(true)
    const result = await execute(useCodeEditorStore.getState().code)
    const st = useExecutionStore.getState()
    st.setOutput(result.output)
    if (result.error) st.setError(result.error)
    st.setExecutionTime(result.executionTime)
    st.setMemoryUsed(result.memoryUsed)
    st.setRunning(false)
  }, [execute])

  const stop = useCallback(() => {
    cancel()
    useExecutionStore.getState().setRunning(false)
    useExecutionStore.getState().setError('Eksekusi dibatalkan')
  }, [cancel])

  const reset = useCallback((starterCode: string) => {
    useCodeEditorStore.getState().setCode(starterCode)
    useExecutionStore.getState().clear()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault()
        void run()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [run])

  const isRunning = useExecutionStore((s) => s.isRunning)

  return { run, stop, reset, isCompiling, isRunning }
}
