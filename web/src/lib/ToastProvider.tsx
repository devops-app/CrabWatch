"use client"

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning' | 'levelup' | 'achievement'
  title: string
  message?: string
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const newToast: Toast = { ...toast, id, duration: toast.duration ?? 5000 }
    setToasts(prev => [...prev, newToast])
    const timer = setTimeout(() => removeToast(id), newToast.duration)
    timersRef.current.set(id, timer)
  }, [removeToast])

  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer))
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <ToastKey toast={toast} onRemove={removeToast} key={toast.id} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastKey({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const bgMap: Record<Toast['type'], string> = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-amber-50 border-amber-200',
    levelup: 'bg-purple-50 border-purple-300',
    achievement: 'bg-amber-50 border-amber-300',
  }

  const iconMap: Record<Toast['type'], string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
    levelup: '⭐',
    achievement: '🏆',
  }

  const titleColorMap: Record<Toast['type'], string> = {
    success: 'text-green-800',
    error: 'text-red-800',
    info: 'text-blue-800',
    warning: 'text-amber-800',
    levelup: 'text-purple-800',
    achievement: 'text-amber-800',
  }

  const iconBgMap: Record<Toast['type'], string> = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-amber-500',
    levelup: 'bg-purple-500',
    achievement: 'bg-amber-500',
  }

  return (
    <div
      className={`pointer-events-auto border rounded-lg shadow-lg p-3 flex items-start gap-3 animate-slide-in ${bgMap[toast.type]}`}
    >
      <div className={`w-6 h-6 rounded-full ${iconBgMap[toast.type]} text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5`}>
        {iconMap[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${titleColorMap[toast.type]}`}>{toast.title}</p>
        {toast.message && <p className="text-xs text-gray-600 mt-0.5">{toast.message}</p>}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-gray-400 hover:text-gray-600 text-lg leading-none flex-shrink-0"
      >
        ×
      </button>
    </div>
  )
}
