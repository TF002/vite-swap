let vConsole: import('vconsole').default | null = null

export async function setupVConsole() {
  const shouldEnable =
    import.meta.env.DEV ||
    new URLSearchParams(window.location.search).get('debug') === 'vconsole'

  if (!shouldEnable || vConsole) {
    return
  }

  const { default: VConsole } = await import('vconsole')

  vConsole = new VConsole({
    theme: 'light',
  })
}
