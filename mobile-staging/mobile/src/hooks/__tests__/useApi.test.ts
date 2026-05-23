import { renderHook, act } from '@testing-library/react'
import { useApi } from '../../hooks/useApi'

describe('useApi', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('initial state', () => {
    it('returns null data, false loading, null error', () => {
      const { result } = renderHook(() => useApi())

      expect(result.current.data).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('returns execute and reset functions', () => {
      const { result } = renderHook(() => useApi())

      expect(typeof result.current.execute).toBe('function')
      expect(typeof result.current.reset).toBe('function')
    })
  })

  describe('execute', () => {
    it('sets loading to true during async call', async () => {
      const mockFn = jest.fn().mockResolvedValue({ id: 1 })
      const { result } = renderHook(() => useApi())

      act(() => {
        result.current.execute(mockFn)
      })

      expect(result.current.loading).toBe(true)
    })

    it('resolves with data on success', async () => {
      const mockData = { id: 1, name: 'test' }
      const mockFn = jest.fn().mockResolvedValue(mockData)
      const { result } = renderHook(() => useApi<typeof mockData>())

      let returnedValue: unknown = null

      await act(async () => {
        returnedValue = await result.current.execute(mockFn)
      })

      expect(result.current.data).toEqual(mockData)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(returnedValue).toEqual(mockData)
    })

    it('sets error on failure', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Network error'))
      const { result } = renderHook(() => useApi())

      let returnedValue: unknown = null

      await act(async () => {
        returnedValue = await result.current.execute(mockFn)
      })

      expect(result.current.error).toBe('Network error')
      expect(result.current.loading).toBe(false)
      expect(result.current.data).toBeNull()
      expect(returnedValue).toBeNull()
    })

    it('handles non-Error throwables', async () => {
      const mockFn = jest.fn().mockRejectedValue('String error')
      const { result } = renderHook(() => useApi())

      await act(async () => {
        await result.current.execute(mockFn)
      })

      expect(result.current.error).toBe('An error occurred')
    })

    it('passes additional arguments to the function', async () => {
      const mockFn = jest.fn().mockResolvedValue({ ok: true })
      const { result } = renderHook(() => useApi())

      await act(async () => {
        await result.current.execute(mockFn, 'arg1', 42)
      })

      expect(mockFn).toHaveBeenCalledWith('arg1', 42)
    })

    it('clears previous error on new successful execute', async () => {
      const failFn = jest.fn().mockRejectedValue(new Error('fail'))
      const successFn = jest.fn().mockResolvedValue({ ok: true })
      const { result } = renderHook(() => useApi())

      await act(async () => {
        await result.current.execute(failFn)
      })

      expect(result.current.error).toBe('fail')

      await act(async () => {
        await result.current.execute(successFn)
      })

      expect(result.current.error).toBeNull()
      expect(result.current.data).toEqual({ ok: true })
    })
  })

  describe('reset', () => {
    it('resets all state to initial values', async () => {
      const mockFn = jest.fn().mockResolvedValue({ id: 1 })
      const { result } = renderHook(() => useApi())

      await act(async () => {
        await result.current.execute(mockFn)
      })

      expect(result.current.data).toEqual({ id: 1 })

      act(() => {
        result.current.reset()
      })

      expect(result.current.data).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('resets error state', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('oops'))
      const { result } = renderHook(() => useApi())

      await act(async () => {
        await result.current.execute(mockFn)
      })

      expect(result.current.error).toBe('oops')

      act(() => {
        result.current.reset()
      })

      expect(result.current.error).toBeNull()
    })
  })
})
