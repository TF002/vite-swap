let vConsole: import('vconsole').default | null = null

export async function setupVConsole() {
  if (vConsole) {
    return
  }

  const { default: VConsole } = await import('vconsole')

  vConsole = new VConsole({
    theme: 'light',
  })
}
