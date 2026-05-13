import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { Button } from '../common/Button'

describe('Button', () => {
  it('renders with title', () => {
    const { getByText } = render(<Button title="Click Me" />)
    expect(getByText('Click Me')).toBeTruthy()
  })

  it('calls onPress when pressed', () => {
    const onPress = jest.fn()
    const { getByText } = render(<Button title="Click Me" onPress={onPress} />)
    fireEvent.click(getByText('Click Me'))
    expect(onPress).toHaveBeenCalled()
  })

  it('hides title when loading', () => {
    const { queryByText } = render(<Button title="Click Me" loading />)
    expect(queryByText('Click Me')).toBeNull()
  })

  it('renders with disabled prop', () => {
    const { getByText } = render(<Button title="Disabled" disabled />)
    expect(getByText('Disabled')).toBeTruthy()
  })

  it('renders with primary variant by default', () => {
    const { getByText } = render(<Button title="Primary" />)
    expect(getByText('Primary')).toBeTruthy()
  })

  it('renders with secondary variant', () => {
    const { getByText } = render(<Button title="Secondary" variant="secondary" />)
    expect(getByText('Secondary')).toBeTruthy()
  })

  it('renders with danger variant', () => {
    const { getByText } = render(<Button title="Danger" variant="danger" />)
    expect(getByText('Danger')).toBeTruthy()
  })

  it('renders with ghost variant', () => {
    const { getByText } = render(<Button title="Ghost" variant="ghost" />)
    expect(getByText('Ghost')).toBeTruthy()
  })
})
