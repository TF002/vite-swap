export const rpcUrl = import.meta.env.DEV
  ? '/rpc'
  : 'https://rpc-testnet.chainlessdw20.com/'

const shouldUseSameOriginWalletProxy = () =>
  import.meta.env.DEV || window.location.protocol === 'https:'

export const getWalletApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (shouldUseSameOriginWalletProxy()) {
    return `/wallet-api${normalizedPath}`
  }

  return `http://mmt-user.budingcc.cc${normalizedPath}`
}

export const getBridgeApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `https://dw20-lock-relayer.chainlessdw20.com${normalizedPath}`
}
