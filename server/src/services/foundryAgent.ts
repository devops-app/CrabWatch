import { randomUUID } from 'crypto'
import { BlobSASPermissions } from '@azure/storage-blob'
import { getBlobService } from '../services/upload'
import { buildAnalysisBlobPath } from '../utils/blobPath'
import { CrabAnalysisRequest, CrabAnalysisResult } from '@crabwatch/shared'
import { getContainer } from './container'

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

### Scylla Genus (Mud Crabs) — Decision Tree
All Scylla species are mud crabs. Differentiate using this sequence:
1. **Color**: blue/mottled → serrata | olive-green → olivacea | greenish → paramamosain | light/narrow → tranquebarica
2. **Size**: tranquebarica (smallest) < paramamosain < serrata ≈ olivacea
3. **Shell texture**: serrata (mottled pattern) vs olivacea (smoother) vs paramamosain (smooth) vs tranquebarica (narrow carapace)

- Scylla serrata (Blue Mud Crab): lighter carapace, distinct mottled pattern, robust claws
- Scylla olivacea (Olive Mud Crab): olive-green carapace, more robust build, smoother shell
- Scylla paramamosain (Green Mud Crab): greenish hue, smaller size, smoother shell, common in mangroves
- Scylla tranquebarica (Tamil Mud Crab): smallest Scylla species, lighter coloration, narrower carapace

### Portunus Genus (Swimming Crabs) — Key trait: swimming paddles on rear legs
- Portunus pelagicus (Blue Swimming Crab): blue carapace, swimming paddles on rear legs
- Portunus sanguinolentus (Red Swimming Crab): reddish coloration, swimming paddles

### Charybdis Genus (Swimming Crabs) — Key trait: distinctive claw coloration
- Charybdis natator (Red-clawed Swimming Crab): red-tipped claws, mottled shell
- Charybdis feriarius (Fighter Crab): bright red and white coloration

- Any other crab species you can identify from visual features

If you cannot confidently identify the species, use "unknown" and describe what you see in rawAnalysis.

## SPECIES ID FORMAT
- Always lowercase, hyphen-separated: "scylla-serrata", "portunus-pelagicus", "charybdis-natator"
- No spaces, no special characters, no uppercase
- Unknown species: use "unknown" (not "unidentified" or "unknown-species")

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

## SIZE ESTIMATION NOTES
- CW estimates from photos have ~15% error due to perspective and angle
- If coin is not adjacent to crab (further in frame), estimate may be 10-20% off
- Note any perspective concerns in suggestions
- Round to nearest 0.5cm for practical field use

## GENDER DETERMINATION (requires ventral/underside photo)
- Male: narrow, triangular abdomen flap (pointed, small)
- Female: broad, rounded abdomen flap (covers most of underside)
- Unknown: if only dorsal view available or abdomen not visible

### Gender Edge Cases
- Sub-adult male: abdomen wider than adult male but not fully rounded — classify as "male" with lower confidence
- Partially visible abdomen: if triangular shape is clear even partially, classify as "male" with caveat
- Damaged abdomen: if flap is broken or missing, return "unknown"

## MATURITY ASSESSMENT (species-dependent thresholds)
- Scylla serrata/olivacea: mature if CW > 8cm + visual cues
- Scylla paramamosain: mature if CW > 6cm + visual cues
- Scylla tranquebarica: mature if CW > 5cm + visual cues
- Portunus species: mature if CW > 5cm + visual cues
- Always consider visual cues alongside size:
  - Mature: darker coloration, pronounced shell features, well-developed claws
  - Immature: lighter coloration, less defined patterns, smaller claws

## CONFIDENCE CALIBRATION
- 0.9-1.0: Distinctive features clearly visible, multiple confirming traits
- 0.7-0.9: Key features visible but some ambiguity (e.g., similar genus species)
- 0.5-0.7: Partial visibility, one view only, or subtle distinguishing features
- 0.3-0.5: Poor quality, very limited visibility, unusual angle
- 0.0-0.3: Cannot identify — return speciesId as "unknown"

## MULTI-PHOTO PRIORITY
- Species ID: dorsal view (primary), ventral (secondary confirmation)
- Gender: ventral view (primary), dorsal (cannot determine)
- Size: photo with clearest coin reference (regardless of view)
- Maturity: combine all views — dorsal for coloration/shell, ventral for abdomen development

## ANALYSIS APPROACH
1. Examine all photos together using priority rules above
2. Identify any coin visible and note its denomination
3. Estimate carapace width using coin as scale reference
4. Determine gender from ventral view if available
5. Assess maturity based on species-specific size thresholds and visual features
6. Count visible crabs across the provided photos and return this as crabCount

## SINGLE-CRAB REQUIREMENT
- Always include crabCount in the JSON response.
- crabCount must be an integer.
- If unsure, choose the most conservative count based on visible evidence.

## BOUNDING BOX REQUIREMENT
- Always include boundingBox when a crab is visible.
- Prefer normalized coordinates relative to the main crab photo (0 to 1 for x, y, width, height).
- width and height must be positive values.

## OUTPUT FORMAT
Return ONLY valid JSON, no markdown, no explanation. Use this exact structure:
{
  "speciesId": "slugified-scientific-name (e.g. scylla-serrata, portunus-pelagicus, charybdis-natator) or 'unknown'",
  "speciesName": "Scientific name (Common Name)",
  "confidence": 0.0 to 1.0,
  "speciesConfidence": 0.0 to 1.0,
  "estimatedCW": carapace width in cm, or null,
  "gender": "male | female | unknown",
  "maturationStatus": "mature | immature | unknown",
  "detectedCoin": "5 sen | 10 sen | 20 sen | 50 sen | null",
  "coinConfidence": 0.0 to 1.0,
  "crabCount": integer count of crabs in the photo set,
  "boundingBox": {
    "x": number,
    "y": number,
    "width": number,
    "height": number
  },
  "suggestions": ["actionable notes for the field researcher — use the language specified in the LANGUAGE section"],
  "rawAnalysis": "description of observations — use the language specified in the LANGUAGE section"
}

Be honest about uncertainty. It is better to say "I'm not confident" with a lower confidence score than to guess incorrectly. If photos are blurry, poorly lit, or the crab is not fully visible, note this in suggestions.`

const VIEW_DETECTION_INSTRUCTIONS = `You are analyzing a single crab photo. Determine whether this is a dorsal (top shell) or ventral (underside/belly) view.

Key visual cues:
- DORSAL: You see the top shell (carapace), claws, and top of legs. The shell has patterns/coloration.
- VENTRAL: You see the underside, abdomen flap, leg joints from below, mouth parts.
- CARAPACE-CLOSEUP: Extreme close-up of shell surface/pattern only.
- UNKNOWN: Cannot determine (too blurry, too dark, not a crab, or ambiguous angle).

Angled views:
- 45-degree or side angle: return "unknown" with reasoning about angle
- Partial dorsal + partial ventral: return whichever view shows more features, note angle in reasoning

Return ONLY valid JSON:
{
  "detectedView": "dorsal | ventral | carapace-closeup | unknown",
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation of what you see"
}
`

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

function extractJson(text: string): string {
  const trimmed = text.trim()
  const match = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n```\s*$/i)
  return match ? match[1].trim() : trimmed
}

async function parseAgentResponse(body: AgentResponse): Promise<string> {
  const firstMessage = body.output?.find((item) => item?.type === 'message')
  const firstTextPart = firstMessage?.content?.find((part) => part?.type === 'output_text')
  if (typeof firstTextPart?.text === 'string') {
    return firstTextPart.text
  }
  throw new Error(`Unexpected agent response format: ${JSON.stringify(body).slice(0, 300)}`)
}

async function toDataUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith('data:')) {
    return imageUrl
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(imageUrl, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const buffer = Buffer.from(await response.arrayBuffer())
    return `data:${contentType};base64,${buffer.toString('base64')}`
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Analysis image fetch timed out')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function uploadAnalysisPhotos(
  files: MulterFile[],
  options?: {
    userId?: string
    sessionId?: string
  }
): Promise<string[]> {
  if (!files || files.length === 0) {
    throw new Error('No files provided')
  }

  const service = getBlobService()
  const containerClient = service.getContainerClient(
    process.env.AZURE_STORAGE_CONTAINER || 'crabwatch-uploads'
  )

  const blobUrls: string[] = []
  const userId = options?.userId || 'anon'
  const sessionId = options?.sessionId || randomUUID()

  for (const [index, file] of files.entries()) {
    if (!ALLOWED_CONTENT_TYPES.includes(file.mimetype)) {
      throw new Error(`Invalid file type: ${file.mimetype}`)
    }

    const blobPath = buildAnalysisBlobPath(userId, sessionId, index, file.originalname, file.mimetype)
    const blobClient = containerClient.getBlockBlobClient(blobPath)

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

function buildLocaleInstructions(locale: string): string {
  if (locale === 'ms') {
    return `## BAHASA
Return rawAnalysis and suggestions in Bahasa Melayu. Keep speciesName in scientific format (Latin binomial + common name in parentheses).`
  }
  return `## LANGUAGE
Return rawAnalysis and suggestions in English.`
}

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

    const body: any = await response.json()
    let content: string

    const firstMessage = body.output?.find((item: any) => item?.type === 'message')
    const firstTextPart = firstMessage?.content?.find((part: any) => part?.type === 'output_text')
    if (typeof firstTextPart?.text === 'string') {
      content = firstTextPart.text
    } else {
      throw new Error(`Unexpected agent response format: ${JSON.stringify(body).slice(0, 300)}`)
    }

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

    const body: any = await response.json()
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

export async function copyAnalysisBlobsToObservation(
  blobUrls: string[],
  userId: string,
  observationId: string
): Promise<string[]> {
  const service = getBlobService()
  const containerName = process.env.AZURE_STORAGE_CONTAINER || 'crabwatch-uploads'
  const containerClient = service.getContainerClient(containerName)

  const copiedUrls: string[] = []

  for (const [index, url] of blobUrls.entries()) {
    try {
      const sourceBlobName = extractBlobName(url, containerName)
      if (!sourceBlobName) {
        copiedUrls.push(url)
        continue
      }

      const dateStr = new Date().toISOString().slice(0, 10)
      const ext = sourceBlobName.split('.').pop() || 'jpg'
      const destBlobName = `observations/${userId}/${dateStr}/${observationId}-${index}.${ext}`

      const sourceBlobClient = containerClient.getBlockBlobClient(sourceBlobName)
      const destBlobClient = containerClient.getBlockBlobClient(destBlobName)

      const download = await sourceBlobClient.download()
      const chunks: Buffer[] = []
      for await (const chunk of download.readableStreamBody!) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      }
      const buffer = Buffer.concat(chunks)

      const extToType: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic' }
      const contentType = extToType[ext.toLowerCase()] || 'image/jpeg'

      await destBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: { blobContentType: contentType },
      })

      const sasUrl = await destBlobClient.generateSasUrl({
        startsOn: new Date(Date.now() - 2 * 60 * 1000),
        expiresOn: new Date(Date.now() + 60 * 60 * 1000),
        permissions: BlobSASPermissions.parse('r'),
      })

      copiedUrls.push(sasUrl)
    } catch {
      copiedUrls.push(url)
    }
  }

  return copiedUrls
}

function validateResult(result: CrabAnalysisResult): CrabAnalysisResult {
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
