import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { photoService } from '../../services/photoService'
import { COLORS, MAX_PHOTOS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'

interface PhotoPickerProps {
  photos: string[]
  onAdd: (uris: string[]) => void
  onRemove: (index: number) => void
  max?: number
}

export function PhotoPicker({
  photos,
  onAdd,
  onRemove,
  max = MAX_PHOTOS,
}: PhotoPickerProps) {
  const handleTakePhoto = async () => {
    if (photos.length >= max) {
      Alert.alert('Limit Reached', `Maximum ${max} photos allowed`)
      return
    }
    const uri = await photoService.takePhoto()
    if (uri) onAdd([uri])
  }

  const handlePickPhotos = async () => {
    const remaining = max - photos.length
    if (remaining <= 0) {
      Alert.alert('Limit Reached', `Maximum ${max} photos allowed`)
      return
    }
    const uris = await photoService.pickFromLibrary(remaining)
    if (uris.length > 0) onAdd(uris)
  }

  const handleShowOptions = () => {
    Alert.alert(
      'Add Photos',
      'Choose a source',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Library', onPress: handlePickPhotos },
        { text: 'Cancel', style: 'cancel' },
      ]
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Photos ({photos.length}/{max})</Text>
      <View style={styles.grid}>
        {photos.map((uri, index) => (
          <View key={index} style={styles.photoWrapper}>
            <Image source={{ uri }} style={styles.photo} />
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => onRemove(index)}
            >
              <Ionicons name="close" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < max && (
          <TouchableOpacity style={styles.addBtn} onPress={handleShowOptions}>
            <Ionicons name="add" size={28} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: FONT.base,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  removeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtn: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
})
