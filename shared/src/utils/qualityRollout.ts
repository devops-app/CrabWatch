export type GateMode = 'off' | 'warn' | 'soft_block' | 'hard_block'

export interface QualityGateModes {
  blur: GateMode
  brightness: GateMode
  view: GateMode
  webcamRes: GateMode
}

export function normalizeGateMode(value: string | undefined | null, fallback: GateMode = 'warn'): GateMode {
  if (!value) return fallback
  const normalized = value.trim().toLowerCase()
  if (normalized === 'off' || normalized === 'warn' || normalized === 'soft_block' || normalized === 'hard_block') {
    return normalized
  }
  return fallback
}

export function applyGateModeToStatus(status: 'pass' | 'warn' | 'fail', mode: GateMode): 'pass' | 'warn' | 'fail' {
  if (mode === 'off') return 'pass'
  if (mode === 'warn' && status === 'fail') return 'warn'
  return status
}

export function isGateBlocking(status: 'pass' | 'warn' | 'fail', mode: GateMode): boolean {
  return status === 'fail' && (mode === 'soft_block' || mode === 'hard_block')
}

export function isGateOverridable(mode: GateMode): boolean {
  return mode === 'soft_block' || mode === 'warn'
}
