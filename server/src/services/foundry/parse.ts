// Parsing + validation helpers for the Foundry agent's raw text output.
import { CrabAnalysisResult } from '@crabwatch/shared'

interface AgentOutputItem {
  type?: string
  content?: AgentContentPart[]
}

interface AgentContentPart {
  type?: string
  text?: string
}

interface AgentResponse {
  output?: AgentOutputItem[]
}

/**
 * Strip markdown code fences from an LLM response before JSON.parse.
 * The agent is instructed to return bare JSON, but it occasionally wraps the
 * payload in ```json ... ``` fences.
 */
export function extractJson(text: string): string {
  const trimmed = text.trim()
  const match = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n```\s*$/i)
  return match ? match[1].trim() : trimmed
}

/**
 * Pull the first output_text part out of an Azure AI Foundry agent response.
 */
export async function parseAgentResponse(body: AgentResponse): Promise<string> {
  const firstMessage = body.output?.find((item) => item?.type === 'message')
  const firstTextPart = firstMessage?.content?.find((part) => part?.type === 'output_text')
  if (typeof firstTextPart?.text === 'string') {
    return firstTextPart.text
  }
  throw new Error(`Unexpected agent response format: ${JSON.stringify(body).slice(0, 300)}`)
}

/**
 * Normalize and sanity-check a parsed analysis result: round numeric fields to
 * sensible precision, clamp crabCount to a non-negative integer, and drop
 * bounding boxes with invalid geometry.
 */
export function validateResult(result: CrabAnalysisResult): CrabAnalysisResult {
  const parsedCrabCount = Number(result.crabCount)
  result.crabCount = Number.isFinite(parsedCrabCount) ? Math.max(0, Math.round(parsedCrabCount)) : 0

  if (result.estimatedCW != null) {
    result.estimatedCW = Math.round(result.estimatedCW * 10) / 10
    if (result.estimatedCW > 50 || result.estimatedCW < 0.5) {
      result.suggestions = [...(result.suggestions || []), `Carapace width ${result.estimatedCW}cm seems unusual. Please double-check.`]
    }
  }

  result.confidence = Math.round(result.confidence * 100) / 100
  result.speciesConfidence = Math.round((result.speciesConfidence ?? result.confidence) * 100) / 100
  result.coinConfidence = Math.round(result.coinConfidence * 100) / 100

  if (result.boundingBox) {
    const { x, y, width, height } = result.boundingBox
    const hasInvalidValue = [x, y, width, height].some((value) => !Number.isFinite(value))
    if (hasInvalidValue || width <= 0 || height <= 0) {
      delete result.boundingBox
    }
  }

  return result
}
