// Azure AI Foundry agent invocation for crab analysis.
//
// This module owns the two agent calls (full analysis + view detection).
// Prompt templates live in ./foundry/prompts, response parsing/validation in
// ./foundry/parse, and blob storage I/O in ./foundry/blob. The blob API is
// re-exported here so existing importers (and whole-module test mocks) keep
// working unchanged.
import { CrabAnalysisRequest, CrabAnalysisResult } from '@crabwatch/shared'
import { getContainer } from './container'
import { SYSTEM_INSTRUCTIONS, VIEW_DETECTION_INSTRUCTIONS, buildLocaleInstructions } from './foundry/prompts'
import { extractJson, parseAgentResponse, validateResult } from './foundry/parse'
import { toDataUrl } from './foundry/blob'

export { uploadAnalysisPhotos, cleanupAnalysisBlobs, copyAnalysisBlobsToObservation } from './foundry/blob'
export type { BlobCopyResult, MulterFile } from './foundry/blob'

export async function analyzeCrabWithAgent(
  request: CrabAnalysisRequest
): Promise<CrabAnalysisResult> {
  const projectEndpoint = getContainer().config.foundry?.projectEndpoint
  const agentName = getContainer().config.foundry?.agentName
  const agentVersion = getContainer().config.foundry?.agentVersion
  const apiKey = getContainer().config.foundry?.apiKey
  const apiVersion = getContainer().config.foundry?.apiVersion

  if (!projectEndpoint || !agentName || !apiKey) {
    throw new Error('Foundry project endpoint, agent name, and API key must be configured')
  }

  const responsesUrl = new URL(`${projectEndpoint}/openai/responses`)
  if (apiVersion) {
    responsesUrl.searchParams.set('api-version', apiVersion)
  }

  let promptText = `You are analyzing ${request.photoUrls.length} crab photo(s) for a field research observation.\n`
  promptText += `Views provided: ${request.views.join(', ')}.\n`
  if (request.coinType) {
    promptText += `Researcher-selected coin reference: ${request.coinType}.\n`
  }
  promptText += `Analyze all photos together to give your best assessment.\n\n`
  if (request.locale) {
    promptText += `${buildLocaleInstructions(request.locale)}\n\n`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 45000)

  try {
    const imageDataUrls = await Promise.all(request.photoUrls.map((url) => toDataUrl(url)))
    const userContent: Array<{ type: 'input_text' | 'input_image'; text?: string; image_url?: string }> = [
      { type: 'input_text', text: `${SYSTEM_INSTRUCTIONS}\n\n${promptText}` },
      ...imageDataUrls.map((url) => ({ type: 'input_image' as const, image_url: url })),
    ]

    const response = await fetch(responsesUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        input: [
          {
            role: 'user',
            content: userContent,
          },
        ],
        agent: {
          type: 'agent_reference',
          name: agentName,
          ...(agentVersion ? { version: agentVersion } : {}),
        },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Agent analysis failed: ${response.status} ${errorText}`)
    }

    const body = await response.json() as { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> }
    const content = await parseAgentResponse(body)

    const parsed: CrabAnalysisResult = JSON.parse(extractJson(content))
    return validateResult(parsed)
  } catch (error: unknown) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Analysis timed out after 45 seconds')
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Agent returned invalid JSON: ${error.message}`)
    }
    throw error
  }
}

export async function detectView(
  photoBuffer: Buffer,
  photoMimeType: string,
  expectedView: string
): Promise<{ detectedView: string; confidence: number; mismatch: boolean; message: string }> {
  const projectEndpoint = getContainer().config.foundry?.projectEndpoint
  const agentName = getContainer().config.foundry?.agentName
  const agentVersion = getContainer().config.foundry?.agentVersion
  const apiKey = getContainer().config.foundry?.apiKey
  const apiVersion = getContainer().config.foundry?.apiVersion

  if (!projectEndpoint || !agentName || !apiKey) {
    throw new Error('Foundry project endpoint, agent name, and API key must be configured')
  }

  const responsesUrl = new URL(`${projectEndpoint}/openai/responses`)
  if (apiVersion) {
    responsesUrl.searchParams.set('api-version', apiVersion)
  }

  const promptText = `Expected view: ${expectedView}. Determine the actual view of this crab photo.`
  const imageDataUrl = `data:${photoMimeType};base64,${photoBuffer.toString('base64')}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(responsesUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: `${VIEW_DETECTION_INSTRUCTIONS}\n\n${promptText}` },
              { type: 'input_image', image_url: imageDataUrl },
            ],
          },
        ],
        agent: {
          type: 'agent_reference',
          name: agentName,
          ...(agentVersion ? { version: agentVersion } : {}),
        },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return {
        detectedView: 'unknown',
        confidence: 0,
        mismatch: false,
        message: 'AI view check unavailable; using local validation only.',
      }
    }

    const body = await response.json() as { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> }
    const content = await parseAgentResponse(body)
    const parsed = JSON.parse(extractJson(content))

    const detectedView = parsed.detectedView || 'unknown'
    const confidence = parsed.confidence ?? 0
    const mismatch = detectedView !== expectedView && detectedView !== 'unknown'
    const message = mismatch
      ? `This looks like a ${detectedView} view, not ${expectedView}`
      : parsed.reasoning || 'View confirmed'

    return { detectedView, confidence, mismatch, message }
  } catch (error: unknown) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        detectedView: 'unknown',
        confidence: 0,
        mismatch: false,
        message: 'AI view check timed out; using local validation only.',
      }
    }
    if (error instanceof SyntaxError) {
      return {
        detectedView: 'unknown',
        confidence: 0,
        mismatch: false,
        message: 'AI view check returned invalid response; using local validation only.',
      }
    }
    return {
      detectedView: 'unknown',
      confidence: 0,
      mismatch: false,
      message: 'AI view check failed; using local validation only.',
    }
  }
}
