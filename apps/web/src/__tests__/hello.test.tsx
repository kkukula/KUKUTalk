import { render, screen } from '@testing-library/react'
import Hello from '@/components/Hello'

describe('Hello component', () => {
  it('renders with default text', () => {
    render(<Hello />)
    expect(screen.getByRole('heading')).toHaveTextContent('Hello World')
  })

  it('renders with given name', () => {
    render(<Hello name="KUKUTalk" />)
    expect(screen.getByRole('heading')).toHaveTextContent('Hello KUKUTalk')
  })
})
