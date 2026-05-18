import { useMemo, useState } from 'react'
import { availableAmount, modes, type Mode } from '../data/exchange'
import { runOnKeyboardClick } from '../lib/keyboard'

type HomePageProps = {
  onOpenRecords: () => void
}

function HomePage({ onOpenRecords }: HomePageProps) {
  const [amount, setAmount] = useState('')
  const [activeMode, setActiveMode] = useState<Mode>('exchange')
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const mode = modes[activeMode]
  const feeAmount = 10

  const receiveAmount = useMemo(() => {
    const value = Number(amount)

    if (!Number.isFinite(value) || value <= 0) {
      return ''
    }

    return String(value)
  }, [amount])

  const paymentAmount = useMemo(() => {
    const value = Number(amount)

    if (!Number.isFinite(value) || value <= 0) {
      return ''
    }

    return String(value)
  }, [amount])

  const totalPayment = useMemo(() => {
    const value = Number(paymentAmount)

    if (!Number.isFinite(value) || value <= 0) {
      return feeAmount
    }

    return value + feeAmount
  }, [paymentAmount])

  const canExchange = Number(receiveAmount) >= 1
  const switchMode = (nextMode: Mode) => {
    setActiveMode(nextMode)
    setAmount('')
    setIsConfirmOpen(false)
  }

  const getTabClassName = (tabMode: Mode) =>
    [
      'relative z-10 flex min-h-10.5 items-center justify-center rounded-[14px]',
      'border-0 bg-transparent px-3 text-[15px] leading-[1.1] font-bold',
      'transition-colors duration-300 ease-out',
      activeMode === tabMode ? 'text-white' : 'text-[#727b90]',
    ].join(' ')

  return (
    <main className="mx-auto min-h-svh w-full max-w-[430px] overflow-hidden bg-[#f6f7fb] text-[#172033] sm:my-4 sm:min-h-[calc(100svh-32px)] sm:rounded-[32px] sm:shadow-[0_24px_70px_rgba(23,32,51,0.18)]">
      <section className="relative pb-[94px] text-white after:absolute after:right-[-78px] after:bottom-[-106px] after:h-[230px] after:w-[230px] after:rounded-full after:border-[34px] after:border-white/12 after:content-[''] bg-[radial-gradient(circle_at_85%_14%,rgba(255,255,255,0.34),transparent_28%),linear-gradient(145deg,#7857e6_0%,#4f7df1_48%,#24b8d5_100%)]">
        <header className="relative z-10 grid h-[58px] grid-cols-[56px_1fr_56px] items-center">
          <div
            className="ml-2 grid h-[42px] w-[42px] cursor-pointer place-items-center rounded-full border-0 bg-white/14 p-0"
            role="button"
            tabIndex={0}
            aria-label="返回"
          >
            <span
              className="h-3 w-3 rotate-45 border-b-[2.5px] border-l-[2.5px] border-white"
              aria-hidden="true"
            ></span>
          </div>
          <h1 className="m-0 text-center text-lg leading-none font-semibold">兑换</h1>
        </header>

        <div className="relative z-10 pt-[18px] pr-0 pb-0 pl-6">
          <p className="mb-2 text-sm font-semibold text-white/78">
            {mode.heroEyebrow}
          </p>
          <h2 className="mb-[11px] text-[31px] leading-[1.08] font-extrabold transition-colors duration-200">
            {mode.heroTitle}
          </h2>
          <span className="block text-[15px] leading-normal text-white/82 transition-colors duration-200">
            {mode.heroSubtitle}
          </span>
        </div>
      </section>

      <section
        className="relative z-10 -mt-[70px] px-[18px] pb-7"
        aria-labelledby="exchange-title"
      >
        <nav
          className="relative mb-3.5 grid grid-cols-2 gap-1.5 overflow-hidden rounded-[18px] border border-[rgba(117,126,150,0.14)] bg-white/88 p-[5px] shadow-[0_16px_36px_rgba(40,56,91,0.12)] backdrop-blur-[18px]"
          aria-label="兑换模式"
        >
          <div
            className={[
              'absolute top-[5px] bottom-[5px] left-[5px] w-[calc((100%-16px)/2)]',
              'rounded-[14px] bg-[#172033] shadow-[0_10px_22px_rgba(23,32,51,0.2)]',
              'transition-transform duration-300 ease-out',
              activeMode === 'wallet'
                ? 'translate-x-[calc(100%+6px)]'
                : 'translate-x-0',
            ].join(' ')}
            aria-hidden="true"
          ></div>
          <div
            className={getTabClassName('exchange')}
            role="button"
            tabIndex={0}
            aria-pressed={activeMode === 'exchange'}
            onClick={() => switchMode('exchange')}
            onKeyDown={runOnKeyboardClick(() => switchMode('exchange'))}
          >
            {modes.exchange.tabLabel}
          </div>
          <div
            className={getTabClassName('wallet')}
            role="button"
            tabIndex={0}
            aria-pressed={activeMode === 'wallet'}
            onClick={() => switchMode('wallet')}
            onKeyDown={runOnKeyboardClick(() => switchMode('wallet'))}
          >
            {modes.wallet.tabLabel}
          </div>
        </nav>

        <div className="rounded-3xl border border-[rgba(117,126,150,0.12)] bg-white p-5 shadow-[0_18px_42px_rgba(36,48,76,0.1)]">
          <div className="mb-6 flex items-start justify-between gap-4 rounded-[20px] bg-linear-to-br from-[#f4f8ff] to-[#effcf9] p-[18px]">
            <div>
              <p className="mb-2 text-[13px] font-semibold text-[#7b8498]">
                {mode.cardEyebrow}
              </p>
              <h2
                className="m-0 text-[22px] leading-[1.1] font-extrabold text-[#172033] transition-colors duration-200"
                id="exchange-title"
              >
                {mode.cardTitle}
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-[rgba(35,181,148,0.12)] px-2.5 py-1.5 text-xs font-extrabold text-[#18a783]">
              实时
            </span>
          </div>

          <div className="mb-2.5 flex items-center justify-between gap-3">
            <label
              className="text-[15px] leading-tight font-extrabold text-[#172033]"
              htmlFor="ftc-amount"
            >
              {mode.inputLabel}
            </label>
            <span className="whitespace-nowrap text-[13px] font-semibold text-[#8a92a6]">
              {mode.balanceLabel} {availableAmount.toLocaleString()} {mode.inputToken}
            </span>
          </div>
          <div className="mb-[18px] grid min-h-[58px] grid-cols-[minmax(0,1fr)_auto] items-center rounded-[18px] border border-[#e9edf5] bg-[#f8faff] px-4 focus-within:border-[rgba(79,125,241,0.42)] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(79,125,241,0.1)]">
            <input
              className="min-w-0 border-0 bg-transparent text-2xl font-extrabold text-[#172033] outline-none placeholder:text-[#b6bdcb]"
              id="ftc-amount"
              inputMode="decimal"
              min="1"
              placeholder={mode.placeholder}
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <strong className="text-[15px] font-black text-[#172033]">
              {mode.inputToken}
            </strong>
          </div>

          <div className="mb-2.5 flex items-center justify-between gap-3">
            <label
              className="text-[15px] leading-tight font-extrabold text-[#172033]"
              htmlFor="dw20-amount"
            >
              {mode.outputLabel}
            </label>
          </div>
          <div className="mb-6 grid min-h-[58px] grid-cols-[minmax(0,1fr)_auto] items-center rounded-[18px] border border-transparent bg-[#f1f4f9] px-4">
            <output
              className="min-h-[30px] text-2xl font-black text-[#23b594]"
              id="dw20-amount"
            >
              {receiveAmount || '0'}
            </output>
            <strong className="text-[15px] font-black text-[#172033]">
              {mode.outputToken}
            </strong>
          </div>

          <div
            className={[
              'mt-0.5 mb-7 grid min-h-[52px] w-full place-items-center rounded-[18px]',
              'border-0 text-[17px] font-[850] transition-[background,box-shadow,transform]',
              'duration-200 active:translate-y-px',
              canExchange
                ? 'cursor-pointer bg-linear-to-br from-[#35c4a0] to-[#2f8df5] text-white shadow-[0_14px_26px_rgba(47,141,245,0.24)]'
                : 'cursor-not-allowed bg-[#e2e6ee] text-[#a5adbd] shadow-none',
            ].join(' ')}
            role="button"
            tabIndex={canExchange ? 0 : -1}
            aria-disabled={!canExchange}
            onClick={() => {
              if (canExchange) {
                setIsConfirmOpen(true)
              }
            }}
            onKeyDown={runOnKeyboardClick(() => setIsConfirmOpen(true), !canExchange)}
          >
            {mode.actionText}
          </div>

          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="m-0 text-lg leading-[1.1] font-[850] text-[#172033]">
              {mode.recordTitle}
            </h2>
            <div
              className="cursor-pointer border-0 bg-transparent p-0 text-sm leading-[1.1] font-extrabold text-[#4f7df1] after:ml-[3px] after:content-['›']"
              role="button"
              tabIndex={0}
              onClick={onOpenRecords}
              onKeyDown={runOnKeyboardClick(onOpenRecords)}
            >
              查看更多
            </div>
          </div>

          <div
            className="grid min-h-[132px] place-items-center content-center rounded-[18px] border border-dashed border-[#d9deea] bg-[#fbfcff] text-[#8a92a6]"
            id="records"
          >
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
      </section>

      {isConfirmOpen && (
        <ConfirmDialog
          feeAmount={feeAmount}
          amountLabel={mode.confirmAmountLabel}
          modeLabel={activeMode === 'wallet' ? '确认存入' : '确认兑换'}
          paymentAmount={paymentAmount}
          totalPayment={totalPayment}
          token={mode.inputToken}
          onCancel={() => setIsConfirmOpen(false)}
          onConfirm={() => setIsConfirmOpen(false)}
        />
      )}
    </main>
  )
}

type ConfirmDialogProps = {
  amountLabel: string
  feeAmount: number
  modeLabel: string
  paymentAmount: string
  token: string
  totalPayment: number
  onCancel: () => void
  onConfirm: () => void
}

function ConfirmDialog({
  amountLabel,
  feeAmount,
  modeLabel,
  paymentAmount,
  token,
  totalPayment,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#111827]/45 px-3 backdrop-blur-[2px] sm:items-center"
      role="presentation"
      onClick={onCancel}
    >
      <section
        className="w-full max-w-[390px] rounded-t-[30px] bg-white p-5 shadow-[0_-24px_70px_rgba(15,23,42,0.24)] [animation:confirm-sheet-in_220ms_ease-out] sm:rounded-[30px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="relative pb-5 text-center">
          <div
            className="absolute top-0 right-0 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-[#f4f6fb] text-2xl leading-none text-[#687386]"
            role="button"
            tabIndex={0}
            aria-label="关闭弹框"
            onClick={onCancel}
            onKeyDown={runOnKeyboardClick(onCancel)}
          >
            ×
          </div>
          <h2
            className="m-0 text-[22px] leading-none font-black text-[#172033]"
            id="confirm-title"
          >
            {modeLabel}
          </h2>
          <p className="mt-2 mb-0 text-sm font-semibold text-[#8a92a6]">
            请确认本次交易明细
          </p>
        </header>

        <div>
          <div className="mb-4 rounded-[24px] bg-[#f7f9fd] px-4 py-5 text-center">
            <p className="mb-2 text-sm font-bold text-[#7b8498]">共计支付</p>
            <strong className="block text-[30px] leading-none font-black text-[#172033]">
              {totalPayment.toLocaleString()}
            </strong>
            <span className="mt-2 block text-sm font-black text-[#23b594]">
              {token}
            </span>
          </div>

          <div className="rounded-[22px] border border-[#edf0f6] bg-white px-4">
            <ConfirmRow
              label={amountLabel}
              value={`${Number(paymentAmount).toLocaleString()} ${token}`}
              valueClassName="text-[#1677ff]"
            />
            <ConfirmRow
              label="手续费"
              value={`${feeAmount.toLocaleString()} ${token}`}
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div
              className="grid min-h-[50px] cursor-pointer place-items-center rounded-[16px] bg-[#f1f4f9] text-[16px] font-extrabold text-[#394255] transition-transform duration-200 active:translate-y-px"
              role="button"
              tabIndex={0}
              onClick={onCancel}
              onKeyDown={runOnKeyboardClick(onCancel)}
            >
              取消
            </div>
            <div
              className="grid min-h-[50px] cursor-pointer place-items-center rounded-[16px] bg-[#172033] text-[16px] font-extrabold text-white shadow-[0_12px_24px_rgba(23,32,51,0.22)] transition-transform duration-200 active:translate-y-px"
              role="button"
              tabIndex={0}
              onClick={onConfirm}
              onKeyDown={runOnKeyboardClick(onConfirm)}
            >
              确定
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function ConfirmRow({
  label,
  value,
  valueClassName = 'text-[#172033]',
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#edf0f6] py-4 last:border-b-0">
      <span className="text-[15px] font-bold text-[#7b8498]">{label}</span>
      <strong className={`text-right text-[16px] font-black ${valueClassName}`}>
        {value}
      </strong>
    </div>
  )
}

export default HomePage
