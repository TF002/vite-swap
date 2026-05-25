import axios from 'axios'
import { getWalletApiUrl } from './api'

export type WalletResponse = {
  walletAddress: string
  status: 'success' | 'NoRegistered' | string
}

const walletAccountIdStorageKey = 'wulian_wallet_account_id'
const walletAddressStorageKey = 'wulian_wallet_address'
const walletRequestMap = new Map<string, Promise<WalletResponse>>()

const getWalletUrl = (accountId: string) =>
  getWalletApiUrl(`/pub/wallet/wulian?userId=${encodeURIComponent(accountId)}`)

export const getStoredWalletAccountId = () =>
  window.localStorage.getItem(walletAccountIdStorageKey) ?? ''

export const getStoredWalletAddress = () =>
  window.localStorage.getItem(walletAddressStorageKey) ?? ''

export async function fetchWalletInfo(accountId: string) {
  const normalizedAccountId = accountId.trim()

  // 没有授权账号时清空本地缓存，后续页面不再请求依赖钱包地址的接口。
  if (!normalizedAccountId) {
    window.localStorage.removeItem(walletAccountIdStorageKey)
    window.localStorage.removeItem(walletAddressStorageKey)

    return {
      status: 'NoRegistered',
      walletAddress: '',
    } satisfies WalletResponse
  }

  const existingRequest = walletRequestMap.get(normalizedAccountId)

  if (existingRequest) {
    return existingRequest
  }

  // 同一个账号的请求复用进行中的 Promise，避免首页和记录页重复请求钱包地址。
  const request = axios
    .get<WalletResponse>(getWalletUrl(normalizedAccountId))
    .then((response) => {
      const walletInfo = response.data
      const walletAddress = walletInfo.walletAddress?.trim() ?? ''

      if (walletInfo.status === 'success' && walletAddress) {
        window.localStorage.setItem(walletAccountIdStorageKey, normalizedAccountId)
        window.localStorage.setItem(walletAddressStorageKey, walletAddress)
      } else {
        window.localStorage.removeItem(walletAccountIdStorageKey)
        window.localStorage.removeItem(walletAddressStorageKey)
      }

      return walletInfo
    })
    .finally(() => {
      walletRequestMap.delete(normalizedAccountId)
    })

  walletRequestMap.set(normalizedAccountId, request)

  return request
}
