export const rpcUrl = '/rpc'

// 生产和本地都使用同源代理路径，避免小程序 WebView 拦截跨域/HTTP 请求。
export const getWalletApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `/wallet-api${normalizedPath}`
}

// 记录相关接口也统一走代理路径，Vite 与 Vercel 分别负责转发。
export const getBridgeApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `/bridge-api${normalizedPath}`
}
