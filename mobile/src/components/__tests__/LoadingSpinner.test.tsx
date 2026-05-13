import React from 'react'
import { render } from '@testing-library/react'
import { LoadingSpinner } from '../common/LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders with default large size', () => {
    const { container } = render(<LoadingSpinner />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders with small size', () => {
    const { container } = render(<LoadingSpinner size="small" />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders with large size', () => {
    const { container } = render(<LoadingSpinner size="large" />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders with custom color', () => {
    const { container } = render(<LoadingSpinner color="#ff0000" />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders full screen spinner', () => {
    const { container } = render(<LoadingSpinner fullScreen />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders inline spinner by default', () => {
    const { container } = render(<LoadingSpinner fullScreen={false} />)
    expect(container.firstChild).toBeTruthy()
  })
})
