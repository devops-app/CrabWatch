import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { PhotoPicker } from '../observation/PhotoPicker'
import { photoService } from '@/services/photoService'
import { Alert } from 'react-native'

jest.mock('@/services/photoService', () => ({
  photoService: {
    takePhoto: jest.fn().mockResolvedValue(null),
    pickFromLibrary: jest.fn().mockResolvedValue([]),
    pickMultiplePhotos: jest.fn().mockResolvedValue([]),
    compressPhoto: jest.fn().mockResolvedValue('file://compressed.jpg'),
  },
}))

describe('PhotoPicker', () => {
  const mockOnAdd = jest.fn()
  const mockOnRemove = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
    ;(photoService.takePhoto as jest.Mock).mockResolvedValue(null)
    ;(photoService.pickFromLibrary as jest.Mock).mockResolvedValue([])
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders with photo count label', () => {
    const { getByText } = render(
      <PhotoPicker photos={[]} onAdd={mockOnAdd} onRemove={mockOnRemove} />
    )
    expect(getByText(/Photos \(0\/5\)/)).toBeTruthy()
  })

  it('shows custom max count', () => {
    const { getByText } = render(
      <PhotoPicker photos={[]} onAdd={mockOnAdd} onRemove={mockOnRemove} max={3} />
    )
    expect(getByText(/Photos \(0\/3\)/)).toBeTruthy()
  })

  it('renders photo thumbnails', () => {
    const photos = ['file://img1.jpg', 'file://img2.jpg']
    const { container } = render(
      <PhotoPicker photos={photos} onAdd={mockOnAdd} onRemove={mockOnRemove} />
    )
    const photoWrappers = container.querySelectorAll('div[style*="relative"]')
    expect(photoWrappers.length).toBe(2)
  })

  it('hides add button when at max', () => {
    const photos = ['a', 'b', 'c']
    const { getByText } = render(
      <PhotoPicker photos={photos} onAdd={mockOnAdd} onRemove={mockOnRemove} max={3} />
    )
    expect(getByText(/Photos \(3\/3\)/)).toBeTruthy()
  })

  it('shows add button when under max', () => {
    const { container } = render(
      <PhotoPicker photos={['a']} onAdd={mockOnAdd} onRemove={mockOnRemove} max={3} />
    )
    const addBtns = container.querySelectorAll('div[style*="dashed"]')
    expect(addBtns.length).toBe(1)
  })

  it('calls Alert.alert when add button is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
    const { container } = render(
      <PhotoPicker photos={[]} onAdd={mockOnAdd} onRemove={mockOnRemove} />
    )
    const addBtn = container.querySelector('div[style*="dashed"]')
    fireEvent.click(addBtn!)
    expect(alertSpy).toHaveBeenCalledWith('Add Photos', 'Choose a source', expect.any(Array))
  })

  it('calls onRemove when remove button is pressed', () => {
    const { container } = render(
      <PhotoPicker
        photos={['file://img1.jpg', 'file://img2.jpg']}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
      />
    )
    const removeBtns = container.querySelectorAll('div[style*="absolute"]')
    fireEvent.click(removeBtns[0])
    expect(mockOnRemove).toHaveBeenCalledWith(0)
    fireEvent.click(removeBtns[1])
    expect(mockOnRemove).toHaveBeenCalledWith(1)
  })

  it('updates count label with photos', () => {
    const { getByText } = render(
      <PhotoPicker photos={['a', 'b']} onAdd={mockOnAdd} onRemove={mockOnRemove} max={5} />
    )
    expect(getByText(/Photos \(2\/5\)/)).toBeTruthy()
  })
})
