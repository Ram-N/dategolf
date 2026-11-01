// Event density for the overview minimap: how many events fall in each equal slice of time.

export interface DensityBin {
  start: number
  end: number
  count: number
}

export function densityBins(years: number[], start: number, end: number, binCount: number): DensityBin[] {
  const size = (end - start) / binCount
  const bins: DensityBin[] = Array.from({ length: binCount }, (_, i) => ({
    start: start + i * size,
    end: start + (i + 1) * size,
    count: 0,
  }))
  for (const y of years) {
    if (y < start || y > end) continue
    bins[Math.min(binCount - 1, Math.floor((y - start) / size))]!.count++
  }
  return bins
}
