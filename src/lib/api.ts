export const rpcUrl = '/rpc'

export const getWalletApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `/wallet-api${normalizedPath}`
}

export const getBridgeApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `/bridge-api${normalizedPath}`
}
