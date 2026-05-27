import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  View,
  FlatList,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useSpeciesStore } from '../../store/speciesStore'
import { SpeciesCard } from '../../components/species/SpeciesCard'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { Input } from '../../components/common/Input'
import { COLORS } from '../../utils/constants'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../navigation/types'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

export function SpeciesListScreen() {
  const { t } = useTranslation('speciesList')
  const navigation = useNavigation<NavigationProp>()
  const { species, loading, loadSpecies } = useSpeciesStore()
  const [search, setSearch] = useState('')

  useFocusEffect(
    React.useCallback(() => {
      loadSpecies()
    }, [loadSpecies])
  )

  const filteredSpecies = species.filter(
    (s) =>
      s.scientificName.toLowerCase().includes(search.toLowerCase()) ||
      s.commonName.toLowerCase().includes(search.toLowerCase())
  )

  const handlePress = (id: string) => {
    navigation.navigate('SpeciesDetail', { speciesId: id })
  }

  if (loading && species.length === 0) {
    return <LoadingSpinner fullScreen />
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <Input
          placeholder={t('searchPlaceholder')}
          value={search}
          onChangeText={setSearch}
          containerStyle={styles.searchInput}
        />
      </View>

      {filteredSpecies.length === 0 ? (
        <EmptyState
          icon="search"
          title={search ? t('empty.searchTitle') : t('empty.defaultTitle')}
          message={
            search
              ? t('empty.searchMessage')
              : t('empty.defaultMessage')
          }
        />
      ) : (
        <FlatList
          data={filteredSpecies}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <SpeciesCard species={item} onPress={() => handlePress(item.id)} />
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  searchInput: {
    marginBottom: 0,
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
  },
})
