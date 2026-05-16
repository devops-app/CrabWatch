import { randomUUID } from 'crypto'
import { BlobSASPermissions } from '@azure/storage-blob'
import { getBlobService } from '../services/upload'
import { sanitizeInput } from '../utils/sanitize'
import { config } from '../config'
import { CrabAnalysisRequest, CrabAnalysisResult } from '@crabwatch/shared'

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

interface MulterFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  buffer: Buffer
  size: number
}

const SYSTEM_INSTRUCTIONS = `You are a marine biology field research assistant helping document crab observations in Malaysian waters. Analyze each crab photo carefully and return structured JSON.

## SPECIES IDENTIFICATION (fully open-ended)
Identify the crab species from the photo. Common Malaysian crab species include:
- Scylla serrata (Blue Mud Crab): lighter carapace, distinct mottled pattern, robust claws
- Scylla olivacea (Olive Mud Crab): olive-green carapace, more robust build, smoother shell
- Scylla paramamosain (Green Mud Crab): greenish hue, smaller size, smoother shell, common in mangroves
- Scylla tranquebarica (Tamil Mud Crab): smallest Scylla species, lighter coloration, narrower carapace
- Portunus pelagicus (Blue Swimming Crab): blue carapace, swimming paddles on rear legs
- Portunus sanguinolentus (Red Swimming Crab): reddish coloration, swimming paddles
- Charybdis natator (Red-clawed Swimming Crab): red-tipped claws, mottled shell
- Charybdis feriarius (Fighter Crab): bright red and white coloration
- Any other crab species you can identify from visual features

If you cannot confidently identify the species, use "unknown" and describe what you see in rawAnalysis.

## SIZE REFERENCE - Malaysian Coins
Look for coins placed next to the crab for scale:
- Third Series (current):
  - 5 sen: 17.78mm diameter
  - 10 sen: 18.80mm diameter
  - 20 sen: 20.60mm diameter
  - 50 sen: 22.65mm diameter
- Second Series (1989-2011):
  - 5 sen: 16.20mm diameter
  - 10 sen: 19.40mm diameter
  - 20 sen: 23.59mm diameter
  - 50 sen: 27.76mm diameter

If researcher-selected coin reference includes series and diameter, prioritize that exact value for scaling.

Estimate carapace width (CW) by comparing crab width to the detected coin. Report CW in centimeters.

## GENDER DETERMINATION (requires ventral/underside photo)
- Male: narrow, triangular abdomen flap (pointed, small)
- Female: broad, rounded abdomen flap (covers most of underside)
- Unknown: if only dorsal view available or abdomen not visible

## MATURITY ASSESSMENT
- Mature: darker coloration, larger size (>8cm CW), pronounced shell features, well-developed claws
- Immature: lighter coloration, smaller size, less defined patterns, smaller claws

## ANALYSIS APPROACH
1. Examine all photos together - dorsal shows species/color, ventral shows gender
2. Identify any coin visible and note its denomination
3. Estimate carapace width using coin as scale reference
4. Determine gender from ventral view if available
5. Assess maturity based on size and visual features
## OUTPUT FORMAT
Return ONLY valid JSON, no markdown, no explanation. Use this exact structure:
{
  "speciesId": "slugified-scientific-name (e.g. scylla-serrata, portunus-pelagicus, charybdis-natator) or 'unknown'",
  "speciesName": "Scientific name (Common Name)",
  "confidence": 0.0 to 1.0,
  "estimatedCW": carapace width in cm, or null,
  "gender": "male | female | unknown",
  "maturationStatus": "mature | immature | unknown",
  "detectedCoin": "5 sen | 10 sen | 20 sen | 50 sen | null",
  "coinConfidence": 0.0 to 1.0,
  "suggestions": ["actionable notes for the field researcher"],
  "rawAnalysis": "plain English description of observations"
}

Be honest about uncertainty. It is better to say "I'm not confident" with a lower confidence score than to guess incorrectly. If photos are blurry, poorly lit, or the crab is not fully visible, note this in suggestions.`

const VIEW_DETECTION_INSTRUCTIONS = `You are analyzing a single crab photo. Determine whether this is a dorsal (top shell) or ventral (underside/belly) view.

Key visual cues:
- DORSAL: You see the top shell (carapace), claws, and top of legs. The shell has patterns/coloration.
- VENTRAL: You see the underside, abdomen flap, leg joints from below, mouth parts.
- CARAPACE-CLOSEUP: Extreme close-up of shell surface/pattern only.
- UNKNOWN: Cannot determine (too blurry, too dark, not a crab, or ambiguous angle).

Return ONLY valid JSON:
{
  "detectedView": "dorsal | ventral | carapace-closeup | unknown",
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation of what you see"
}
`

async function parseAgentResponse(body: any): Promise<string> {
  const firstMessage = body.output?.find((item: any) => item?.type === 'message')
  const firstTextPart = firstMessage?.content?.find((part: any) => part?.type === 'output_text')
  if (typeof firstTextPart?.text === 'string') {
    return firstTextPart.text
  }
  throw new Error(`Unexpected agent response format: ${JSON.stringify(body).slice(0, 300)}`)
}

export async function uploadAnalysisPhotos(
  files: MulterFile[]
): Promise<string[]> {
  if (!files || files.length === 0) {
    throw new Error('No files provided')
  }

  const service = getBlobService()
  const containerClient = service.getContainerClient(
    process.env.AZURE_STORAGE_CONTAINER || 'crabwatch-uploads'
  )

  const blobUrls: string[] = []

  for (const file of files) {
    if (!ALLOWED_CONTENT_TYPES.includes(file.mimetype)) {
      throw new Error(`Invalid file type: ${file.mimetype}`)
    }

    const safeFileName = `analysis/${randomUUID()}-${sanitizeInput(file.originalname, 100).replace(/[^a-zA-Z0-9._-]/g, '')}`
    const blobClient = containerClient.getBlockBlobClient(safeFileName)

    await blobClient.upload(file.buffer, file.buffer.length, {
      blobHTTPHeaders: { blobContentType: file.mimetype },
    })

    const readSasUrl = await blobClient.generateSasUrl({
      startsOn: new Date(Date.now() - 2 * 60 * 1000),
      expiresOn: new Date(Date.now() + 20 * 60 * 1000),
      permissions: BlobSASPermissions.parse('r'),
    })

    blobUrls.push(readSasUrl)
  }

  return blobUrls
}

export async function analyzeCrabWithAgent(
  request: CrabAnalysisRequest
): Promise<CrabAnalysisResult> {
  const projectEndpoint = config.foundry?.projectEndpoint
  const agentName = config.foundry?.agentName
  const agentVersion = config.foundry?.agentVersion
  const apiKey = config.foundry?.apiKey
  const apiVersion = config.foundry?.apiVersion

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

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 45000)

  try {
    const userContent: Array<{ type: 'input_text' | 'input_image'; text?: string; image_url?: string }> = [
      { type: 'input_text', text: `${SYSTEM_INSTRUCTIONS}\n\n${promptText}` },
      ...request.photoUrls.map((url) => ({ type: 'input_image' as const, image_url: url })),
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

    const body: any = await response.json()
    let content: string

    const firstMessage = body.output?.find((item: any) => item?.type === 'message')
    const firstTextPart = firstMessage?.content?.find((part: any) => part?.type === 'output_text')
    if (typeof firstTextPart?.text === 'string') {
      content = firstTextPart.text
    } else {
      throw new Error(`Unexpected agent response format: ${JSON.stringify(body).slice(0, 300)}`)
    }

    const parsed: CrabAnalysisResult = JSON.parse(content.trim())
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
  photoUrl: string,
  expectedView: string
): Promise<{ detectedView: string; confidence: number; mismatch: boolean; message: string }> {
  const projectEndpoint = config.foundry?.projectEndpoint
  const agentName = config.foundry?.agentName
  const apiKey = config.foundry?.apiKey
  const apiVersion = config.foundry?.apiVersion

  if (!projectEndpoint || !agentName || !apiKey) {
    throw new Error('Foundry project endpoint, agent name, and API key must be configured')
  }

  const responsesUrl = new URL(`${projectEndpoint}/openai/responses`)
  if (apiVersion) {
    responsesUrl.searchParams.set('api-version', apiVersion)
  }

  const promptText = `Expected view: ${expectedView}. Determine the actual view of this crab photo.`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

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
              { type: 'input_image', image_url: photoUrl },
            ],
          },
        ],
        agent: {
          type: 'agent_reference',
          name: agentName,
        },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`View detection failed: ${response.status} ${errorText}`)
    }

    const body: any = await response.json()
    const content = await parseAgentResponse(body)
    const parsed = JSON.parse(content.trim())

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
      throw new Error('View detection timed out')
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Agent returned invalid JSON: ${error.message}`)
    }
    throw error
  }
}

export async function cleanupAnalysisBlobs(blobUrls: string[]): Promise<void> {
  const service = getBlobService()
  const containerName = process.env.AZURE_STORAGE_CONTAINER || 'crabwatch-uploads'

  for (const url of blobUrls) {
    try {
      const blobName = extractBlobName(url, containerName)
      if (blobName) {
        const containerClient = service.getContainerClient(containerName)
        const blockBlobClient = containerClient.getBlockBlobClient(blobName)
        await blockBlobClient.delete()
      }
    } catch {
      // Best effort cleanup - don't fail if cleanup fails
    }
  }
}

function validateResult(result: CrabAnalysisResult): CrabAnalysisResult {
  if (result.estimatedCW != null) {
    result.estimatedCW = Math.round(result.estimatedCW * 10) / 10
    if (result.estimatedCW > 50 || result.estimatedCW < 0.5) {
      result.suggestions = [...(result.suggestions || []), `Carapace width ${result.estimatedCW}cm seems unusual. Please double-check.`]
    }
  }

  result.confidence = Math.round(result.confidence * 100) / 100
  result.coinConfidence = Math.round(result.coinConfidence * 100) / 100

  return result
}

function extractBlobName(url: string, containerName: string): string | null {
  try {
    const parsed = new URL(url)
    const marker = `/${containerName}/`
    const idx = parsed.pathname.indexOf(marker)
    if (idx === -1) return null
    return decodeURIComponent(parsed.pathname.slice(idx + marker.length))
  } catch {
    const marker = `${containerName}/`
    const idx = url.indexOf(marker)
    if (idx === -1) return null
    const tail = url.slice(idx + marker.length)
    return tail.split('?')[0] || null
  }
}
