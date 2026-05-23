import axios from 'axios'
import { message } from 'antd'
import { type UIEvent, useCallback, useEffect, useRef, useState } from 'react'
import { recordTabs, type RecordFilter } from '../data/exchange'
import { runOnKeyboardClick } from '../lib/keyboard'

type RecordsPageProps = {
  onBackHome: () => void
}

type BridgeRecordType = 'deposit' | 'withdraw'

type BridgeRecord = {
  type: BridgeRecordType
  chainless_tx_hash: string
  chain_tx_hash: string | null
  wulian_account: string
  evm_address: string
  amount: string
  happened_at: number
  created_at: number
  updated_at: number
  deposit_seq: number | null
  notify_status: string | null
  status: string
  failed_reason: string | null
}

type DepositRecord = {
  chainless_tx_hash: string
  wulian_account: string
  evm_address: string
  amount: string
  deposit_time: number
  deposit_seq: number
  status?: string
  failed_reason?: string | null
}

type WithdrawalRecord = {
  chainless_tx_hash: string
  chain_tx_hash?: string | null
  wulian_account: string
  evm_address: string
  amount: string
  happened_at?: number
  withdraw_time?: number
  sign_time?: number
  created_at?: number
  updated_at?: number
  status?: string
  failed_reason?: string | null
}

type ListResponse<T> = {
  items: T[]
  pagination: {
    page: number
    page_size: number
    total: number
  }
}

const evmAddress = '0x61e026f9ad0af11c2900ada0d59b9dd32f023e98'
const pageSize = 20
const inFlightRequests = new Map<
  string,
  Promise<ListResponse<BridgeRecord | DepositRecord | WithdrawalRecord>>
>()

const getTransactionsUrl = (page: number) =>
  `https://dw20-lock-relayer.chainlessdw20.com/pub/bridge/transactions?evm_address=${evmAddress}&page=${page}&page_size=${pageSize}`

const getDepositsUrl = (page: number) =>
  `https://dw20-lock-relayer.chainlessdw20.com/pub/bridge/deposits?evm_address=${evmAddress}&page=${page}&page_size=${pageSize}`

const getWithdrawalsUrl = (page: number) =>
  `https://dw20-lock-relayer.chainlessdw20.com/pub/bridge/withdrawals?evm_address=${evmAddress}&page=${page}&page_size=${pageSize}`

async function fetchRecordPage<T extends BridgeRecord | DepositRecord | WithdrawalRecord>(
  url: string,
) {
  const existingRequest = inFlightRequests.get(url)

  if (existingRequest) {
    return existingRequest as Promise<ListResponse<T>>
  }

  const request = axios
    .get<ListResponse<T>>(url)
    .then((response) => response.data)
    .finally(() => {
      inFlightRequests.delete(url)
    })

  inFlightRequests.set(
    url,
    request as Promise<ListResponse<BridgeRecord | DepositRecord | WithdrawalRecord>>,
  )

  return request
}

function RecordsPage({ onBackHome }: RecordsPageProps) {
  const [recordFilter, setRecordFilter] = useState<RecordFilter>('all')
  const [records, setRecords] = useState<BridgeRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const requestKeyRef = useRef('')
  const activeTabIndex = recordTabs.findIndex((tab) => tab.value === recordFilter)

  const loadRecords = useCallback(
    async (nextPage: number, mode: 'reset' | 'append') => {
      const requestKey = `${recordFilter}-${nextPage}-${mode}`
      requestKeyRef.current = requestKey

      try {
        if (mode === 'reset') {
          setRecords([])
          setPage(1)
          setHasMore(false)
          setIsLoading(true)
        } else {
          setIsLoadingMore(true)
        }

        if (recordFilter === 'exchange') {
          const response = await fetchRecordPage<DepositRecord>(getDepositsUrl(nextPage))
          const exchangeRecords = (response.items ?? []).map(normalizeExchangeDeposit)

          console.log('deposits response:', response)

          if (requestKeyRef.current !== requestKey) {
            return
          }

          setRecords((currentRecords) =>
            mode === 'reset' ? exchangeRecords : [...currentRecords, ...exchangeRecords],
          )
          setPage(response.pagination.page)
          setHasMore(
            response.pagination.page * response.pagination.page_size <
              response.pagination.total,
          )
        } else if (recordFilter === 'wallet') {
          const response = await fetchRecordPage<WithdrawalRecord>(
            getWithdrawalsUrl(nextPage),
          )
          const walletRecords = (response.items ?? []).map(normalizeWithdrawal)

          console.log('withdrawals response:', response)

          if (requestKeyRef.current !== requestKey) {
            return
          }

          setRecords((currentRecords) =>
            mode === 'reset' ? walletRecords : [...currentRecords, ...walletRecords],
          )
          setPage(response.pagination.page)
          setHasMore(
            response.pagination.page * response.pagination.page_size <
              response.pagination.total,
          )
        } else {
          const response = await fetchRecordPage<BridgeRecord>(
            getTransactionsUrl(nextPage),
          )
          const transactionRecords = response.items ?? []

          console.log('transactions response:', response)

          if (requestKeyRef.current !== requestKey) {
            return
          }

          setRecords((currentRecords) =>
            mode === 'reset' ? transactionRecords : [...currentRecords, ...transactionRecords],
          )
          setPage(response.pagination.page)
          setHasMore(
            response.pagination.page * response.pagination.page_size <
              response.pagination.total,
          )
        }
      } catch (error) {
        console.error('records request failed:', error)
        message.error('兑换记录获取失败')
      } finally {
        if (requestKeyRef.current === requestKey) {
          setIsLoading(false)
          setIsLoadingMore(false)
        }
      }
    },
    [recordFilter],
  )

  useEffect(() => {
    queueMicrotask(() => {
      void loadRecords(1, 'reset')
    })
  }, [loadRecords])

  const loadMore = () => {
    if (isLoading || isLoadingMore || !hasMore) {
      return
    }

    void loadRecords(page + 1, 'append')
  }

  const handleListScroll = (event: UIEvent<HTMLElement>) => {
    const target = event.currentTarget
    const distanceToBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight

    if (distanceToBottom < 80) {
      loadMore()
    }
  }

  const getRecordTabClassName = (filter: RecordFilter) =>
    [
      'relative z-10 flex min-h-12 items-center justify-center border-0',
      'bg-transparent px-1 text-[15px] font-extrabold',
      'transition-colors duration-300 ease-out',
      recordFilter === filter ? 'text-[#1f55ff]' : 'text-[#5d6472]',
    ].join(' ')

  return (
    <main className="mx-auto flex h-svh w-full max-w-[430px] flex-col overflow-hidden bg-[#f6f7fb] text-[#172033] sm:my-4 sm:h-[calc(100svh-32px)] sm:rounded-[32px] sm:shadow-[0_24px_70px_rgba(23,32,51,0.18)]">
      <header className="z-20 grid h-[58px] shrink-0 grid-cols-[56px_1fr_56px] items-center border-b border-[#edf0f6] bg-white/95 backdrop-blur-xl">
        <div
          className="ml-2 grid h-[42px] w-[42px] cursor-pointer place-items-center rounded-full border-0 bg-[#f3f5fa] p-0"
          role="button"
          tabIndex={0}
          aria-label="返回首页"
          onClick={onBackHome}
          onKeyDown={runOnKeyboardClick(onBackHome)}
        >
          <span
            className="h-3 w-3 rotate-45 border-b-[2.5px] border-l-[2.5px] border-[#172033]"
            aria-hidden="true"
          ></span>
        </div>
        <h1 className="m-0 text-center text-lg leading-none font-bold">兑换记录</h1>
      </header>

      <nav
        className="relative z-10 grid shrink-0 grid-cols-3 border-b border-[#dfe4ee] bg-white"
        aria-label="记录分类"
      >
        <div
          className={[
            'absolute bottom-0 left-0 h-0.75 w-1/3 rounded-full bg-[#1f55ff]',
            'transition-transform duration-300 ease-out',
            activeTabIndex === 1 && 'translate-x-full',
            activeTabIndex === 2 && 'translate-x-[200%]',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden="true"
        ></div>
        <div
          className={[
            'absolute inset-y-1.5 left-1.5 w-[calc((100%-12px)/3)] rounded-[14px]',
            'transition-transform duration-300 ease-out',
            activeTabIndex === 1 && 'translate-x-[calc(100%+0px)]',
            activeTabIndex === 2 && 'translate-x-[calc(200%+0px)]',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden="true"
        ></div>
        {recordTabs.map((tab) => (
          <div
            className={getRecordTabClassName(tab.value)}
            role="button"
            tabIndex={0}
            aria-pressed={recordFilter === tab.value}
            key={tab.value}
            onClick={() => setRecordFilter(tab.value)}
            onKeyDown={runOnKeyboardClick(() => setRecordFilter(tab.value))}
          >
            {tab.label}
          </div>
        ))}
      </nav>

      <section
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 [animation:record-list-in_220ms_ease-out]"
        key={recordFilter}
        onScroll={handleListScroll}
      >
        {isLoading && <RecordState text="正在加载记录..." />}

        {!isLoading && records.length === 0 && <EmptyRecordState />}

        {!isLoading &&
          records.map((record) => (
            <BridgeRecordCard
              key={`${record.type}-${record.chainless_tx_hash}-${record.deposit_seq ?? record.happened_at}`}
              record={record}
            />
          ))}

        {!isLoading && isLoadingMore && <RecordState text="正在加载更多..." />}

        {!isLoading && records.length > 0 && !hasMore && (
          <p className="m-0 py-2 text-center text-xs font-bold text-[#a0a8b8]">
            没有更多记录了
          </p>
        )}
      </section>
    </main>
  )
}

function BridgeRecordCard({ record }: { record: BridgeRecord }) {
  const isExchange = record.type === 'deposit'
  const amount = formatTokenAmount(record.amount)
  const inputToken = isExchange ? 'DW20' : 'FTC'
  const outputToken = isExchange ? 'FTC' : 'DW20'
  const rate = isExchange ? '1 DW20 = 1 FTC' : '1 FTC = 1 DW20'

  return (
    <article className="overflow-hidden rounded-[22px] border border-[#edf0f6] bg-white shadow-[0_14px_32px_rgba(36,48,76,0.08)]">
      <header className="flex items-center justify-between gap-3 border-b border-[#f0f2f7] px-4 py-4">
        <div className="flex items-center gap-2">
          <span
            className={`h-6 w-1.5 rounded-full ${isExchange ? 'bg-[#23b594]' : 'bg-[#24a9e8]'}`}
          ></span>
          <h2 className="m-0 text-base font-extrabold text-[#172033]">
            {isExchange ? '猜奖币兑换' : '奖金存入钱包'}
          </h2>
        </div>
        <span className={getStatusClassName(record.status)}>
          {formatStatus(record.status)}
        </span>
      </header>

      <dl className="grid gap-3 px-5 py-5">
        <RecordRow label="兑换方向" value={isExchange ? 'DW20 → FTC' : 'FTC → DW20'} />
        <RecordRow label="兑换数量" value={`${amount} ${inputToken}`} />
        <RecordRow label="获得数量" value={`${amount} ${outputToken}`} />
        <RecordRow label="汇率" value={rate} />
        <RecordRow label="时间" value={formatTimestamp(record.happened_at)} />
        <StatusRow status={record.status} />
      </dl>
    </article>
  )
}

function RecordState({ text }: { text: string }) {
  return (
    <div className="grid min-h-[180px] place-items-center rounded-[22px] border border-dashed border-[#d9deea] bg-white text-[15px] font-bold text-[#8a92a6]">
      {text}
    </div>
  )
}

function EmptyRecordState() {
  return (
    <div className="grid min-h-[180px] place-items-center rounded-[22px] border border-dashed border-[#d9deea] bg-white text-[#8a92a6]">
      <div className="flex flex-col items-center">
        <svg
          className="mb-1 h-14 w-14 fill-none stroke-[#c3cbe0] stroke-[3] [stroke-linecap:round] [stroke-linejoin:round]"
          viewBox="0 0 80 80"
          role="presentation"
          aria-hidden="true"
        >
          <path d="M24 31h32l5 13v18H19V44l5-13Z" />
          <path d="M29 37h22l3 8H26l3-8Z" />
          <path d="M19 44h14c2 5 12 5 14 0h14" />
          <path d="M31 26h18M36 19h8M24 22l-5-5M56 22l5-5" />
        </svg>
        <p className="m-0 text-[15px] leading-tight font-semibold">暂无数据</p>
      </div>
    </div>
  )
}

function RecordRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[82px_1fr] items-center gap-4">
      <dt className="text-[15px] font-bold text-[#6f7788]">{label}</dt>
      <dd className="m-0 break-all text-right text-[15px] font-black text-[#222b3d]">
        {value}
      </dd>
    </div>
  )
}

function StatusRow({ status }: { status: string }) {
  return (
    <div className="grid grid-cols-[82px_1fr] items-center gap-4">
      <dt className="text-[15px] font-bold text-[#6f7788]">状态</dt>
      <dd className="m-0 flex justify-end">
        <span className={getStatusClassName(status)}>{formatStatus(status)}</span>
      </dd>
    </div>
  )
}

function normalizeExchangeDeposit(record: DepositRecord): BridgeRecord {
  return {
    type: 'deposit',
    chainless_tx_hash: record.chainless_tx_hash,
    chain_tx_hash: null,
    wulian_account: record.wulian_account,
    evm_address: record.evm_address,
    amount: record.amount,
    happened_at: record.deposit_time,
    created_at: record.deposit_time,
    updated_at: record.deposit_time,
    deposit_seq: record.deposit_seq,
    notify_status: null,
    status: record.status ?? 'success',
    failed_reason: record.failed_reason ?? null,
  }
}

function normalizeWithdrawal(record: WithdrawalRecord): BridgeRecord {
  const happenedAt =
    record.happened_at ??
    record.withdraw_time ??
    record.sign_time ??
    record.created_at ??
    record.updated_at ??
    0

  return {
    type: 'withdraw',
    chainless_tx_hash: record.chainless_tx_hash,
    chain_tx_hash: record.chain_tx_hash ?? null,
    wulian_account: record.wulian_account,
    evm_address: record.evm_address,
    amount: record.amount,
    happened_at: happenedAt,
    created_at: record.created_at ?? happenedAt,
    updated_at: record.updated_at ?? happenedAt,
    deposit_seq: null,
    notify_status: null,
    status: record.status ?? 'success',
    failed_reason: record.failed_reason ?? null,
  }
}

function getStatusClassName(status: string) {
  const base = 'rounded-full px-2.5 py-1 text-xs font-black'

  if (status === 'success') {
    return `${base} bg-[#eaf8f4] text-[#23a57f]`
  }

  if (status === 'error') {
    return `${base} bg-[#fff1f0] text-[#d93026]`
  }

  if (status === 'pending') {
    return `${base} bg-[#fff7e6] text-[#d46b08]`
  }

  if (status === 'in_progress') {
    return `${base} bg-[#eef4ff] text-[#1f55ff]`
  }

  return `${base} bg-[#f1f4f9] text-[#6f7788]`
}

function formatStatus(status: string) {
  const statusMap: Record<string, string> = {
    error: '失败',
    in_progress: '处理中',
    pending: '待处理',
    success: '成功',
  }

  return statusMap[status] ?? status
}

function formatTokenAmount(amount: string) {
  try {
    const value = BigInt(amount)
    const base = 10n ** 18n
    const integer = value / base
    const fraction = value % base

    if (fraction === 0n) {
      return integer.toLocaleString()
    }

    const fractionText = fraction.toString().padStart(18, '0').replace(/0+$/, '')

    return `${integer.toLocaleString()}.${fractionText}`
  } catch {
    return amount
  }
}

function formatTimestamp(timestamp: number) {
  return new Date(timestamp * 1000)
    .toLocaleString('zh-CN', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    .replace(/\//g, '-')
}

export default RecordsPage
