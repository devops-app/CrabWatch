import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { GPSCapture } from '../observation/GPSCapture'

jest.mock('@/hooks/useLocation')
jest.mock('@/utils/formatters')

import { useLocation } from '@/hooks/useLocation'
import { formatCoordinates } from '@/utils/formatters'

describe('GPSCapture', () => {
  const mockUseLocation = useLocation as jest.MockedFunction<typeof useLocation>

  const mockLocation = {
    latitude: 3.139,
    longitude: 101.6869,
    accuracy: 12,
    altitude: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseLocation.mockReturnValue({
      location: null,
      loading: false,
      error: null,
      hasPermission: true,
      refresh: jest.fn().mockResolvedValue(undefined),
      requestPermission: jest.fn(),
    })
    ;(formatCoordinates as jest.Mock).mockReturnValue('3.1390, 101.6869')
  })

  it('renders with label and toggle', () => {
    const { getByText } = render(
      <GPSCapture
        latitude={null}
        longitude={null}
        onLocationCapture={jest.fn()}
      />
    )
    expect(getByText('Location')).toBeTruthy()
    expect(getByText('GPS Auto')).toBeTruthy()
  })

  it('shows no location captured when no coords', () => {
    const { getByText } = render(
      <GPSCapture
        latitude={null}
        longitude={null}
        onLocationCapture={jest.fn()}
      />
    )
    expect(getByText('No location captured')).toBeTruthy()
  })

  it('displays coordinates when provided', () => {
    const { getByText } = render(
      <GPSCapture
        latitude={3.139}
        longitude={101.6869}
        onLocationCapture={jest.fn()}
      />
    )
    expect(getByText('3.1390, 101.6869')).toBeTruthy()
  })

  it('shows accuracy when location from hook is available', () => {
    mockUseLocation.mockReturnValue({
      location: mockLocation,
      loading: false,
      error: null,
      hasPermission: true,
      refresh: jest.fn(),
      requestPermission: jest.fn(),
    })

    const { getByText } = render(
      <GPSCapture
        latitude={3.139}
        longitude={101.6869}
        onLocationCapture={jest.fn()}
      />
    )
    expect(getByText('Accuracy: 12m')).toBeTruthy()
  })

  it('shows error message when error exists', () => {
    mockUseLocation.mockReturnValue({
      location: null,
      loading: false,
      error: 'GPS signal lost',
      hasPermission: false,
      refresh: jest.fn(),
      requestPermission: jest.fn(),
    })

    const { getByText } = render(
      <GPSCapture
        latitude={null}
        longitude={null}
        onLocationCapture={jest.fn()}
      />
    )
    expect(getByText('GPS signal lost')).toBeTruthy()
  })

  it('shows permission button when no permission and no error', () => {
    mockUseLocation.mockReturnValue({
      location: null,
      loading: false,
      error: null,
      hasPermission: false,
      refresh: jest.fn(),
      requestPermission: jest.fn(),
    })

    const { getByText } = render(
      <GPSCapture
        latitude={null}
        longitude={null}
        onLocationCapture={jest.fn()}
      />
    )
    expect(getByText('Enable Location Access')).toBeTruthy()
  })

  it('toggles to manual mode', () => {
    const onManualToggle = jest.fn()
    const { getByText } = render(
      <GPSCapture
        latitude={null}
        longitude={null}
        onLocationCapture={jest.fn()}
        onManualToggle={onManualToggle}
      />
    )
    fireEvent.click(getByText('GPS Auto'))
    expect(onManualToggle).toHaveBeenCalled()
  })

  it('shows Manual label in manual mode', () => {
    const { getByText, queryByText } = render(
      <GPSCapture
        latitude={null}
        longitude={null}
        onLocationCapture={jest.fn()}
        manualMode
      />
    )
    expect(getByText('Manual')).toBeTruthy()
    expect(queryByText('Capture Location')).toBeNull()
  })

  it('hides capture button in manual mode', () => {
    const { queryByText } = render(
      <GPSCapture
        latitude={null}
        longitude={null}
        onLocationCapture={jest.fn()}
        manualMode
      />
    )
    expect(queryByText('Capture Location')).toBeNull()
  })

  it('calls onLocationCapture when location changes', async () => {
    const onCapture = jest.fn()
    mockUseLocation.mockReturnValue({
      location: mockLocation,
      loading: false,
      error: null,
      hasPermission: true,
      refresh: jest.fn(),
      requestPermission: jest.fn(),
    })

    render(
      <GPSCapture
        latitude={null}
        longitude={null}
        onLocationCapture={onCapture}
      />
    )

    await waitFor(() => {
      expect(onCapture).toHaveBeenCalledWith(3.139, 101.6869)
    })
  })

  it('calls refresh when capture button is pressed', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined)
    mockUseLocation.mockReturnValue({
      location: null,
      loading: false,
      error: null,
      hasPermission: true,
      refresh,
      requestPermission: jest.fn(),
    })

    const { getByText } = render(
      <GPSCapture
        latitude={null}
        longitude={null}
        onLocationCapture={jest.fn()}
      />
    )

    fireEvent.click(getByText('Capture Location'))
    await waitFor(() => {
      expect(refresh).toHaveBeenCalled()
    })
  })
})
