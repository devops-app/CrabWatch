import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../services/api'
import { Card } from '../../components/common/Card'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { Button } from '../../components/common/Button'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import type { SpeciesResponse, SpeciesTranslation } from '@crabwatch/shared'
import type { RootStackParamList } from '../../navigation/types'

type SpeciesDetailRouteProp = RouteProp<RootStackParamList, 'SpeciesDetail'>

export function SpeciesDetailScreen() {
  const { t, i18n } = useTranslation('speciesDetail')
  const route = useRoute<SpeciesDetailRouteProp>()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { speciesId } = route.params
  const [species, setSpecies] = useState<SpeciesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [translation, setTranslation] = useState<SpeciesTranslation | null>(null)
  const [translating, setTranslating] = useState(false)

  const needsTranslation = i18n.language !== 'en'

  useEffect(() => {
    loadSpecies()
  }, [speciesId])

  useEffect(() => {
    if (!species || !needsTranslation) {
      setTranslation(null)
      return
    }
    let cancelled = false
    setTranslating(true)
    api.translateSpecies(species.id, i18n.language)
      .then((data) => {
        if (!cancelled) setTranslation(data)
      })
      .catch(() => {
        if (!cancelled) setTranslation(null)
      })
      .finally(() => {
        if (!cancelled) setTranslating(false)
      })
    return () => { cancelled = true }
  }, [species, needsTranslation, i18n.language])

  const displayName = useMemo(() => {
    if (translation && needsTranslation) return translation.commonName
    return species?.commonName ?? ''
  }, [species, translation, needsTranslation])

  const displayDescription = useMemo(() => {
    if (translation && needsTranslation) return translation.description
    return species?.description ?? ''
  }, [species, translation, needsTranslation])

  const displayKeyFeatures = useMemo(() => {
    if (translation && needsTranslation) return translation.keyFeatures
    return species?.keyFeatures ?? []
  }, [species, translation, needsTranslation])

  const displayDistributionZones = useMemo(() => {
    if (translation && needsTranslation) return translation.distributionZones
    return species?.distributionZones ?? []
  }, [species, translation, needsTranslation])

  const loadSpecies = async () => {
    try {
      const data = await api.getSpecies(speciesId)
      setSpecies(data)
    } catch {
      setSpecies(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  if (!species) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text>{t('notFound')}</Text>
          <Button
            title={t('goBack')}
            variant="secondary"
            onPress={() => navigation.goBack()}
            style={{ marginTop: 16 }}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.scientificName}>{species.scientificName}</Text>
        {translating ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 4, marginBottom: 16 }} />
        ) : (
          <Text style={styles.commonName}>{displayName}</Text>
        )}

        {species.images.length > 0 && (
          <FlatList
            data={species.images}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(url, i) => `${url}-${i}`}
            contentContainerStyle={styles.galleryScroll}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.galleryImage} />
            )}
          />
        )}

        <Card padding={16}>
          <Text style={styles.cardTitle}>{t('description')}</Text>
          {translating ? (
            <ActivityIndicator color={COLORS.textSecondary} />
          ) : (
            <Text style={styles.description}>{displayDescription}</Text>
          )}
        </Card>

        {displayKeyFeatures.length > 0 && (
          <Card padding={16}>
            <Text style={styles.cardTitle}>{t('keyFeatures')}</Text>
            {displayKeyFeatures.map((feature: { trait: string; value: string }, i: number) => (
              <View key={i} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                <View style={styles.featureText}>
                  <Text style={styles.featureTrait}>{feature.trait}</Text>
                  <Text style={styles.featureValue}>{feature.value}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {displayDistributionZones.length > 0 && (
          <Card padding={16}>
            <Text style={styles.cardTitle}>
              {t('distributionZones', { count: displayDistributionZones.length })}
            </Text>
            {displayDistributionZones.map((zone: { name: string }, i: number) => (
              <View key={i} style={styles.zoneRow}>
                <Ionicons name="location" size={18} color={COLORS.primary} />
                <Text style={styles.zoneName}>{zone.name}</Text>
              </View>
            ))}
          </Card>
        )}

        <Button
          title={t('backToSpecies')}
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scientificName: {
    fontSize: FONT['4xl'],
    fontWeight: '700',
    color: COLORS.text,
    fontStyle: 'italic',
  },
  commonName: {
    fontSize: FONT.xl,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  galleryScroll: {
    paddingBottom: 8,
  },
  galleryImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginRight: 10,
    backgroundColor: COLORS.border,
  },
  cardTitle: {
    fontSize: FONT.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  description: {
    fontSize: FONT.base,
    color: COLORS.text,
    lineHeight: 21,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
  },
  featureText: {
    flex: 1,
  },
  featureTrait: {
    fontSize: FONT.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  featureValue: {
    fontSize: FONT['sm+'],
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
  },
  zoneName: {
    fontSize: FONT.base,
    color: COLORS.text,
  },
  backBtn: {
    marginTop: 8,
  },
})
