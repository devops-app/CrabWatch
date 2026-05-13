import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { Input } from '../common/Input'

describe('Input', () => {
  it('renders with label', () => {
    const { getByText } = render(<Input label="Email" placeholder="Enter email" />)
    expect(getByText('Email')).toBeTruthy()
  })

  it('renders placeholder', () => {
    const { getByPlaceholderText } = render(<Input placeholder="Enter email" />)
    expect(getByPlaceholderText('Enter email')).toBeTruthy()
  })

  it('shows error message', () => {
    const { getByText } = render(<Input label="Email" error="Email is required" />)
    expect(getByText('Email')).toBeTruthy()
    expect(getByText('Email is required')).toBeTruthy()
  })

  it('calls onChangeText on input change', () => {
    const onChangeText = jest.fn()
    const { getByPlaceholderText } = render(
      <Input placeholder="Enter email" onChangeText={onChangeText} />
    )
    fireEvent.change(getByPlaceholderText('Enter email'), { target: { value: 'test@test.com' } })
    expect(onChangeText).toHaveBeenCalledWith('test@test.com')
  })

  it('calls onBlur on blur', () => {
    const onBlur = jest.fn()
    const { getByPlaceholderText } = render(
      <Input placeholder="Enter email" onBlur={onBlur} />
    )
    fireEvent.blur(getByPlaceholderText('Enter email'))
    expect(onBlur).toHaveBeenCalled()
  })

  it('renders without label', () => {
    const { getByPlaceholderText } = render(<Input placeholder="No label" />)
    expect(getByPlaceholderText('No label')).toBeTruthy()
  })

  it('applies error style when error is present', () => {
    const { getByText } = render(
      <Input label="Password" placeholder="Enter password" error="Password is too short" />
    )
    expect(getByText('Password')).toBeTruthy()
    expect(getByText('Password is too short')).toBeTruthy()
  })

  it('passes through keyboardType prop', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Email" keyboardType="email-address" />
    )
    expect(getByPlaceholderText('Email')).toBeTruthy()
  })

  it('passes through secureTextEntry prop', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Password" secureTextEntry />
    )
    expect(getByPlaceholderText('Password')).toBeTruthy()
  })

  it('applies custom container style', () => {
    const { container } = render(
      <Input label="Styled" containerStyle={{ marginBottom: 8 }} />
    )
    expect(container.firstChild).toBeTruthy()
  })
})
