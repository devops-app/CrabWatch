import React from 'react'
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native'
import type { SpeciesResponse } from '@crabwatch/shared'
import { COLORS } from '../../utils/constants'

interface SpeciesCardProps {
  species: SpeciesResponse
  onPress: () => void
}

export function SpeciesCard({ species, onPress }: SpeciesCardProps) {
  const thumbnail = species.images[0]

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {thumbnail ? (
        <Image source={{ uri: thumbnail }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderText}>🦀</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.scientificName}>{species.scientificName}</Text>
        <Text style={styles.commonName}>{species.commonName}</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: COLORS.background,
  },
  imagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 32,
  },
  info: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  scientificName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    fontStyle: 'italic',
  },
  commonName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
})
