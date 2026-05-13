interface CacheEntry<T> {
  data: T
  expiry: number
}

const MAX_SIZE = 1000

class LRUCache<K, V> {
  private map = new Map<K, V>()
  private maxSize: number

  constructor(maxSize: number) {
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined
    const value = this.map.get(key)!
    this.map.delete(key)
    this.map.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key)
    } else if (this.map.size >= this.maxSize) {
      const firstKey = this.map.keys().next().value
      if (firstKey !== undefined) {
        this.map.delete(firstKey)
      }
    }
    this.map.set(key, value)
  }

  delete(key: K): void {
    this.map.delete(key)
  }

  clear(): void {
    this.map.clear()
  }

  *keys(): IterableIterator<K> {
    yield* this.map.keys()
  }

  get size(): number {
    return this.map.size
  }
}

const cache = new LRUCache<string, CacheEntry<unknown>>(MAX_SIZE)

const DEFAULT_TTL = 5 * 60 * 1000

export function getFromCache<T>(key: string, _ttl?: number): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiry) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

export function setCache<T>(key: string, data: T, ttl?: number): void {
  cache.set(key, {
    data,
    expiry: Date.now() + (ttl || DEFAULT_TTL),
  })
}

export function clearCache(pattern?: string): void {
  if (!pattern) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) {
      cache.delete(key)
    }
  }
}
