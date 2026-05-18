import type { KeyboardEvent } from 'react'

export const runOnKeyboardClick =
  (handler: () => void, disabled = false) =>
  (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || (event.key !== 'Enter' && event.key !== ' ')) {
      return
    }

    event.preventDefault()
    handler()
  }
