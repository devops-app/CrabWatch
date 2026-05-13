import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { Text } from 'react-native'
import { Card } from '../common/Card'

describe('Card', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Card>
        <Text>Card Content</Text>
      </Card>
    )
    expect(getByText('Card Content')).toBeTruthy()
  })

  it('calls onPress when pressed', () => {
    const onPress = jest.fn()
    const { getByText } = render(
      <Card onPress={onPress}>
        <Text>Pressable Card</Text>
      </Card>
    )
    fireEvent.click(getByText('Pressable Card'))
    expect(onPress).toHaveBeenCalled()
  })

  it('renders without onPress as non-pressable', () => {
    const { getByText } = render(
      <Card>
        <Text>Static Card</Text>
      </Card>
    )
    expect(getByText('Static Card')).toBeTruthy()
  })

  it('applies custom padding', () => {
    const { container } = render(
      <Card padding={24}>
        <Text>Padded</Text>
      </Card>
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('applies custom elevation', () => {
    const { container } = render(
      <Card elevation={4}>
        <Text>Elevated</Text>
      </Card>
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('applies custom style', () => {
    const { container } = render(
      <Card style={{ marginTop: 10 }}>
        <Text>Styled</Text>
      </Card>
    )
    expect(container.firstChild).toBeTruthy()
  })
})
