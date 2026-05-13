import React from 'react'
import { render } from '@testing-library/react'
import { EmptyState } from '../common/EmptyState'

describe('EmptyState', () => {
  it('renders with title', () => {
    const { getByText } = render(<EmptyState title="No Data" />)
    expect(getByText('No Data')).toBeTruthy()
  })

  it('renders with message', () => {
    const { getByText } = render(
      <EmptyState title="No Data" message="There is nothing to show" />
    )
    expect(getByText('No Data')).toBeTruthy()
    expect(getByText('There is nothing to show')).toBeTruthy()
  })

  it('renders without message', () => {
    const { getByText } = render(<EmptyState title="No Data" />)
    expect(getByText('No Data')).toBeTruthy()
  })

  it('renders with custom icon', () => {
    const { getByText } = render(<EmptyState icon="home-outline" title="Home Empty" />)
    expect(getByText('Home Empty')).toBeTruthy()
  })

  it('uses default icon', () => {
    const { getByText } = render(<EmptyState title="Default Icon" />)
    expect(getByText('Default Icon')).toBeTruthy()
  })
})
