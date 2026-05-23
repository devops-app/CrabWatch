import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { SpeciesCard } from '../species/SpeciesCard'
import type { SpeciesResponse } from '@crabwatch/shared'

const mockSpecies: SpeciesResponse = {
  id: 'sp-1',
  scientificName: 'Scylla serrata',
  commonName: 'Green Mud Crab',
  description: 'The green mud crab is a large species of crab.',
  keyFeatures: [
    { trait: 'Color', value: 'Greenish-blue carapace' },
    { trait: 'Size', value: 'Up to 25 cm' },
  ],
  images: ['https://example.com/crab1.jpg', 'https://example.com/crab2.jpg'],
  distributionZones: [],
}

const mockSpeciesNoImages: SpeciesResponse = {
  ...mockSpecies,
  images: [],
}

describe('SpeciesCard', () => {
  it('renders scientific name', () => {
    const { getByText } = render(
      <SpeciesCard species={mockSpecies} onPress={jest.fn()} />
    )
    expect(getByText('Scylla serrata')).toBeTruthy()
  })

  it('renders common name', () => {
    const { getByText } = render(
      <SpeciesCard species={mockSpecies} onPress={jest.fn()} />
    )
    expect(getByText('Green Mud Crab')).toBeTruthy()
  })

  it('renders image when available', () => {
    const { container } = render(
      <SpeciesCard species={mockSpecies} onPress={jest.fn()} />
    )
    const images = container.querySelectorAll('div[data-testid], div[style]')
    const imageDiv = Array.from(images).find(el => el.getAttribute('style')?.includes('72'))
    expect(imageDiv).toBeTruthy()
  })

  it('shows placeholder when no images', () => {
    const { container } = render(
      <SpeciesCard species={mockSpeciesNoImages} onPress={jest.fn()} />
    )
    const img = container.querySelector('img')
    expect(img).toBeFalsy()
  })

  it('calls onPress when card is pressed', () => {
    const onPress = jest.fn()
    const { container } = render(
      <SpeciesCard species={mockSpecies} onPress={onPress} />
    )
    const card = container.querySelector('div[style]')
    fireEvent.click(card!)
    expect(onPress).toHaveBeenCalled()
  })

  it('renders with all required species fields', () => {
    const { getByText } = render(
      <SpeciesCard species={mockSpecies} onPress={jest.fn()} />
    )
    expect(getByText('Scylla serrata')).toBeTruthy()
    expect(getByText('Green Mud Crab')).toBeTruthy()
  })
})
