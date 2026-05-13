import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../../utils/constants'

const APP_VERSION = '1.0.0'

export function AboutScreen() {
  const handleEmailPress = () => {
    Linking.openURL('mailto:support@dsigncodehub.com')
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="finger-print" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.appName}>CrabWatch</Text>
          <Text style={styles.appVersion}>v{APP_VERSION}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>
          <Text style={styles.cardText}>
            CrabWatch is a citizen science platform for monitoring crab populations
            across Malaysia. Researchers and citizens can capture crab observations
            with AI-powered species identification, size estimation, and data analytics
            to support conservation efforts.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Made By</Text>
          <View style={styles.creatorRow}>
            <Ionicons name="code-slash" size={20} color={COLORS.primary} />
            <Text style={styles.creatorText}>DsignCodeHub</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Support</Text>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={handleEmailPress}
          >
            <Ionicons name="mail" size={20} color={COLORS.textSecondary} />
            <Text style={styles.contactText}>support@dsigncodehub.com</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Features</Text>
          <Text style={styles.featureText}>
            {'\u2022'} AI-powered crab species identification
          </Text>
          <Text style={styles.featureText}>
            {'\u2022'} Size estimation with coin reference
          </Text>
          <Text style={styles.featureText}>
            {'\u2022'} Real-time observation tracking
          </Text>
          <Text style={styles.featureText}>
            {'\u2022'} Interactive species map
          </Text>
          <Text style={styles.featureText}>
            {'\u2022'} Research-grade analytics dashboard
          </Text>
        </View>

        <Text style={styles.footerText}>
          {new Date().getFullYear()} DsignCodeHub. All rights reserved.
        </Text>
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
  logoSection: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 12,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },
  appName: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
  },
  appVersion: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creatorText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  contactText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  featureText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    paddingLeft: 4,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 16,
  },
})
