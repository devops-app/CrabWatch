import { config } from '../config'

interface TranslateRequest {
  text: string
  to: string
}

interface TranslateResponse {
  translatedText: string
  originalText: string
}

interface SpeciesTranslation {
  commonName: string
  description: string
}

const translationCache = new Map<string, SpeciesTranslation>()

function getCacheKey(speciesId: string, to: string): string {
  return `${speciesId}:${to}`
}

export async function translateSpecies({
  speciesId,
  commonName,
  description,
  to,
}: {
  speciesId: string
  commonName: string
  description: string
  to: string
}): Promise<SpeciesTranslation> {
  const cacheKey = getCacheKey(speciesId, to)
  const cached = translationCache.get(cacheKey)
  if (cached) return cached

  const { apiKey, endpoint, region } = config.azureTranslator
  if (!apiKey || !endpoint) {
    return { commonName, description }
  }

  const texts = [commonName, description].filter(Boolean)
  if (texts.length === 0) {
    return { commonName, description }
  }

  try {
    const response = await fetch(`${endpoint}/translate?api-version=3.0&to=${to}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': apiKey,
        ...(region !== 'global' && { 'Ocp-Apim-Subscription-Region': region }),
      },
      body: JSON.stringify(texts.map((text) => [{ text }])),
    })

    if (!response.ok) {
      return { commonName, description }
    }

    const results = await response.json() as Array<Array<{ translations: Array<{ text: string }> }>>
    const translatedCommonName = results[0]?.[0]?.translations?.[0]?.text ?? commonName
    const translatedDescription = texts.length > 1 ? (results[1]?.[0]?.translations?.[0]?.text ?? description) : description

    const result: SpeciesTranslation = {
      commonName: translatedCommonName,
      description: translatedDescription,
    }

    translationCache.set(cacheKey, result)
    return result
  } catch {
    return { commonName, description }
  }
}
