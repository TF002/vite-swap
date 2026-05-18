import { useMemo, useState } from 'react'
import {
  records,
  recordTabs,
  type RecordFilter,
  type RecordItem,
} from '../data/exchange'
import { runOnKeyboardClick } from '../lib/keyboard'

type RecordsPageProps = {
  onBackHome: () => void
}

function RecordsPage({ onBackHome }: RecordsPageProps) {
  const [recordFilter, setRecordFilter] = useState<RecordFilter>('all')
  const activeTabIndex = recordTabs.findIndex((tab) => tab.value === recordFilter)

  const visibleRecords = useMemo(() => {
    if (recordFilter === 'all') {
      return records
    }

    return records.filter((record) => record.type === recordFilter)
  }, [recordFilter])

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
      >
        {visibleRecords.map((record) => (
          <RecordCard key={`${record.type}-${record.time}`} record={record} />
        ))}
      </section>
    </main>
  )
}

function RecordCard({ record }: { record: RecordItem }) {
  return (
    <article className="overflow-hidden rounded-[22px] border border-[#edf0f6] bg-white shadow-[0_14px_32px_rgba(36,48,76,0.08)]">
      <header className="flex items-center gap-2 border-b border-[#f0f2f7] px-4 py-4">
        <span className="h-6 w-1.5 rounded-full bg-[#24a9e8]"></span>
        <h2 className="m-0 text-base font-extrabold text-[#172033]">
          {record.title}
        </h2>
      </header>

      <dl className="grid gap-5 px-5 py-5">
        <RecordRow label="兑换方向" value={record.direction} />
        <RecordRow label="兑换数量" value={record.amount} />
        <RecordRow label="获得数量" value={record.received} />
        <RecordRow label="汇率" value={record.rate} />
        <RecordRow label="时间" value={record.time} />
        <div className="grid grid-cols-[96px_1fr] items-center gap-4">
          <dt className="text-[15px] font-bold text-[#6f7788]">状态</dt>
          <dd className="m-0 text-right text-[15px] font-black text-[#24a148]">
            {record.status}
          </dd>
        </div>
      </dl>
    </article>
  )
}

function RecordRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[96px_1fr] items-center gap-4">
      <dt className="text-[15px] font-bold text-[#6f7788]">{label}</dt>
      <dd className="m-0 text-right text-[15px] font-black text-[#222b3d]">
        {value}
      </dd>
    </div>
  )
}

export default RecordsPage
