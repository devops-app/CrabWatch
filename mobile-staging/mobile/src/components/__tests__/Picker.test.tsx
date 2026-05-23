import React from 'react'
import { render } from '@testing-library/react'
import { Picker, PickerWithAlert } from '../common/Picker'
import { Alert } from 'react-native'

const mockOptions = [
  { label: 'Option A', value: 'a' },
  { label: 'Option B', value: 'b' },
  { label: 'Option C', value: 'c' },
]

describe('Picker', () => {
  it('renders with label', () => {
    const { getByText } = render(
      <Picker label="Choose" options={mockOptions} selectedValue="a" onValueChange={jest.fn()} />
    )
    expect(getByText('Choose')).toBeTruthy()
  })

  it('renders selected value label', () => {
    const { getByText } = render(
      <Picker options={mockOptions} selectedValue="b" onValueChange={jest.fn()} />
    )
    expect(getByText('Option B')).toBeTruthy()
  })

  it('renders placeholder when no value selected', () => {
    const { getByText } = render(
      <Picker options={mockOptions} selectedValue="" onValueChange={jest.fn()} />
    )
    expect(getByText('Select...')).toBeTruthy()
  })

  it('renders custom placeholder', () => {
    const { getByText } = render(
      <Picker options={mockOptions} selectedValue="" onValueChange={jest.fn()} placeholder="Pick one" />
    )
    expect(getByText('Pick one')).toBeTruthy()
  })

  it('renders error message', () => {
    const { getByText } = render(
      <Picker label="Choose" options={mockOptions} selectedValue="" onValueChange={jest.fn()} error="Required" />
    )
    expect(getByText('Required')).toBeTruthy()
  })

  it('renders without label', () => {
    const { getByText } = render(
      <Picker options={mockOptions} selectedValue="a" onValueChange={jest.fn()} />
    )
    expect(getByText('Option A')).toBeTruthy()
  })
})

describe('PickerWithAlert', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders with label and selected value', () => {
    const { getByText } = render(
      <PickerWithAlert label="Choose" options={mockOptions} selectedValue="a" onValueChange={jest.fn()} />
    )
    expect(getByText('Choose')).toBeTruthy()
    expect(getByText('Option A')).toBeTruthy()
  })

  it('renders placeholder when no value selected', () => {
    const { getByText } = render(
      <PickerWithAlert options={mockOptions} selectedValue="" onValueChange={jest.fn()} />
    )
    expect(getByText('Select...')).toBeTruthy()
  })

  it('renders error message', () => {
    const { getByText } = render(
      <PickerWithAlert label="Choose" options={mockOptions} selectedValue="" onValueChange={jest.fn()} error="Required" />
    )
    expect(getByText('Required')).toBeTruthy()
  })
})
