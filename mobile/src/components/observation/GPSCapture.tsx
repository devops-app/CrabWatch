import React, { useState, useCallback, useRef, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import MapView, { Marker as MapMarker } from 'react-native-maps'
import { Ionicons } from '@expo/vector-icons'
import { useLocation } from '../../hooks/useLocation'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import { formatCoordinates } from '../../utils/formatters'

const MALAYSIA_REGION = {
  latitude: 4.2105,
  longitude: 101.9758,
  latitudeDelta: 6,
  longitudeDelta: 10,
}

interface GPSCaptureProps {
  latitude: number | null
  longitude: number | null
  onLocationCapture: (lat: number, lng: number) => void
  manualMode?: boolean
  onManualToggle?: () => void
}

export function GPSCapture({
  latitude,
  longitude,
  onLocationCapture,
  manualMode = false,
  onManualToggle,
}: GPSCaptureProps) {
  const { location, loading, error, hasPermission, refresh } = useLocation()
  const [capturing, setCapturing] = useState(false)
  const mapRef = useRef<MapView | null>(null)

  const handleCapture = useCallback(async () => {
    if (manualMode) return
    setCapturing(true)
    try {
      await refresh()
    } catch {
      Alert.alert('GPS Error', 'Failed to capture location. Try again or use manual mode.')
    } finally {
      setCapturing(false)
    }
  }, [manualMode, refresh])

  React.useEffect(() => {
    if (location && !manualMode) {
      onLocationCapture(location.latitude, location.longitude)
    }
  }, [location, manualMode, onLocationCapture])

  const handleMapPress = useCallback((e: any) => {
    const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate
    onLocationCapture(lat, lng)
  }, [onLocationCapture])

  const mapRegion = latitude != null && longitude != null
    ? { latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : MALAYSIA_REGION

  useEffect(() => {
    if (!manualMode || !mapRef.current || latitude == null || longitude == null) return
    mapRef.current.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      },
      350
    )
  }, [manualMode, latitude, longitude])

  const handleRecenter = useCallback(() => {
    if (!mapRef.current) return
    if (latitude != null && longitude != null) {
      mapRef.current.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        350
      )
      return
    }

    if (location) {
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        },
        350
      )
    }
  }, [latitude, longitude, location])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Location</Text>
        <TouchableOpacity onPress={onManualToggle} style={styles.toggle}>
          <Text style={[styles.toggleText, manualMode && styles.toggleActive]}>
            {manualMode ? 'Manual' : 'GPS Auto'}
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!hasPermission && !error && (
        <TouchableOpacity style={styles.permissionBtn} onPress={refresh}>
          <Text style={styles.permissionText}>Enable Location Access</Text>
        </TouchableOpacity>
      )}

      {manualMode && (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            initialRegion={mapRegion}
            onPress={handleMapPress}
            style={styles.map}
            showsUserLocation
            showsMyLocationButton
            showsCompass
            showsScale
          >
            {latitude != null && longitude != null && (
              <MapMarker
                coordinate={{ latitude, longitude }}
                title="Selected Location"
                description={formatCoordinates(latitude, longitude)}
              />
            )}
          </MapView>
          <TouchableOpacity style={styles.recenterBtn} onPress={handleRecenter}>
            <Ionicons name="locate" size={14} color="#ffffff" />
            <Text style={styles.recenterText}>Recenter</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.coordsBox}>
        {loading || capturing ? (
          <Text style={styles.coordsText}>Acquiring GPS...</Text>
        ) : latitude != null && longitude != null ? (
          <>
            <Ionicons name="location" size={18} color={COLORS.success} />
            <Text style={styles.coordsText}>
              {formatCoordinates(latitude, longitude)}
            </Text>
            {location && !manualMode && (
              <Text style={styles.accuracyText}>
                Accuracy: {Math.round(location.accuracy)}m
              </Text>
            )}
          </>
        ) : (
          <Text style={styles.coordsText}>No location captured</Text>
        )}
      </View>

      {!manualMode && (
        <TouchableOpacity
          style={[styles.captureBtn, capturing && styles.captureBtnDisabled]}
          onPress={handleCapture}
          disabled={capturing}
        >
          <Ionicons name="locate" size={18} color="#ffffff" />
          <Text style={styles.captureText}>
            {capturing ? 'Capturing...' : 'Capture Location'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: FONT.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  toggle: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleText: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
  },
  toggleActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.errorLight,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorText: {
    fontSize: FONT['sm+'],
    color: COLORS.error,
    flex: 1,
  },
  permissionBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  permissionText: {
    color: '#ffffff',
    fontSize: FONT.base,
    fontWeight: '600',
  },
  mapContainer: {
    marginBottom: 8,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: 200,
  },
  recenterBtn: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  recenterText: {
    color: '#ffffff',
    fontSize: FONT.sm,
    fontWeight: '600',
  },
  coordsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  coordsText: {
    fontSize: FONT.base,
    color: COLORS.text,
    fontFamily: 'monospace',
    flex: 1,
  },
  accuracyText: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  captureBtnDisabled: {
    opacity: 0.6,
  },
  captureText: {
    color: '#ffffff',
    fontSize: FONT.base,
    fontWeight: '600',
  },
})
