import { config } from '../config'

interface KeyFeature {
  trait: string
  value: string
}

interface DistributionZone {
  name: string
}

interface SpeciesTranslation {
  commonName: string
  description: string
  keyFeatures: KeyFeature[]
  distributionZones: DistributionZone[]
}

const translationCache = new Map<string, SpeciesTranslation>()

function getCacheKey(speciesId: string, to: string): string {
  return `${speciesId}:${to}`
}

function fallbackResponse(params: {
  commonName: string
  description: string
  keyFeatures: KeyFeature[]
  distributionZones: DistributionZone[]
}): SpeciesTranslation {
  return {
    commonName: params.commonName,
    description: params.description,
    keyFeatures: params.keyFeatures,
    distributionZones: params.distributionZones,
  }
}

export async function translateSpecies({
  speciesId,
  commonName,
  description,
  keyFeatures,
  distributionZones,
  to,
}: {
  speciesId: string
  commonName: string
  description: string
  keyFeatures: KeyFeature[]
  distributionZones: DistributionZone[]
  to: string
}): Promise<SpeciesTranslation> {
  const cacheKey = getCacheKey(speciesId, to)
  const cached = translationCache.get(cacheKey)
  if (cached) return cached

  const { apiKey, endpoint, region } = config.azureTranslator
  if (!apiKey || !endpoint) {
    console.warn('[Translate] Missing Azure Translator config — returning original text')
    return fallbackResponse({ commonName, description, keyFeatures, distributionZones })
  }

  // Flatten all translatable strings into a single ordered array
  const texts: string[] = [commonName, description].filter(Boolean)
  for (const kf of keyFeatures) {
    if (kf.trait) texts.push(kf.trait)
    if (kf.value) texts.push(kf.value)
  }
  for (const dz of distributionZones) {
    if (dz.name) texts.push(dz.name)
  }

  if (texts.length === 0) {
    return fallbackResponse({ commonName, description, keyFeatures, distributionZones })
  }

  try {
    const response = await fetch(`${endpoint}/translate?api-version=3.0&to=${to}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': apiKey,
        ...(region !== 'global' && { 'Ocp-Apim-Subscription-Region': region }),
      },
      body: JSON.stringify(texts.map((text) => ({ text }))),
    })

    if (!response.ok) {
      const body = await response.text()
      console.error(`[Translate] API error ${response.status}: ${body}`)
      return fallbackResponse({ commonName, description, keyFeatures, distributionZones })
    }

    const results = await response.json() as Array<{ translations: Array<{ text: string }> }>

    // Extract translated texts in order
    const translatedTexts = results.map((r) => r?.translations?.[0]?.text ?? '')

    // Reassemble: first two are commonName and description (if they were sent)
    let idx = 0
    const getTranslated = (original: string): string => {
      if (!original) return original
      const translated = translatedTexts[idx] ?? original
      idx++
      return translated
    }

    const translatedCommonName = [commonName].filter(Boolean).includes(commonName) ? getTranslated(commonName) : commonName
    const translatedDescription = [description].filter(Boolean).includes(description) ? getTranslated(description) : description

    const translatedKeyFeatures: KeyFeature[] = keyFeatures.map((kf) => ({
      trait: kf.trait ? getTranslated(kf.trait) : kf.trait,
      value: kf.value ? getTranslated(kf.value) : kf.value,
    }))

    const translatedDistributionZones: DistributionZone[] = distributionZones.map((dz) => ({
      name: dz.name ? getTranslated(dz.name) : dz.name,
    }))

    const result: SpeciesTranslation = {
      commonName: translatedCommonName,
      description: translatedDescription,
      keyFeatures: translatedKeyFeatures,
      distributionZones: translatedDistributionZones,
    }

    translationCache.set(cacheKey, result)
    return result
  } catch (err) {
    console.error('[Translate] Exception:', err)
    return fallbackResponse({ commonName, description, keyFeatures, distributionZones })
  }
}
