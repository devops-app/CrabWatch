export interface ClusteringOptions {
  radius: number
  minZoom: number
  maxZoom: number
  extent: number
}

export interface ClusterPoint {
  x: number
  y: number
  count: number
  points: [number, number][]
}

export function clusterObservations(
  lngs: number[],
  lats: number[],
  zoom: number,
  options: ClusteringOptions = {
    radius: 80,
    minZoom: 3,
    maxZoom: 18,
    extent: 512,
  }
): ClusterPoint[] {
  const { radius, minZoom, maxZoom, extent } = options

  if (zoom < minZoom) {
    return [{ x: 0, y: 0, count: lngs.length, points: lngs.map((lng, i) => [lng, lats[i]]) }]
  }

  const zoomLevel = Math.max(minZoom, Math.min(maxZoom, zoom))
  const cellSize = radius * (2 ** (18 - zoomLevel)) / extent
  const grid = new Map<string, ClusterPoint>()

  for (let i = 0; i < lngs.length; i++) {
    const x = Math.floor(lngs[i] / cellSize)
    const y = Math.floor(lats[i] / cellSize)
    const key = `${x},${y}`

    if (!grid.has(key)) {
      grid.set(key, { x, y, count: 0, points: [] })
    }

    const cluster = grid.get(key)!
    cluster.count += 1
    cluster.points.push([lngs[i], lats[i]])
  }

  return Array.from(grid.values())
}
