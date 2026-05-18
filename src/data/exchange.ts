export const availableAmount = 10000

export const modes = {
  exchange: {
    actionText: '立即兑换',
    balanceLabel: '可用',
    cardEyebrow: '当前兑换价',
    cardTitle: '1 DW20 = 1 FTC',
    confirmAmountLabel: '兑换数量',
    heroEyebrow: '资产兑换',
    heroTitle: 'DW20 兑换 FTC',
    heroSubtitle: '用 DW20 兑换猜奖币 FTC，即可参与竞猜',
    inputLabel: '输入兑换数量',
    inputToken: 'DW20',
    outputLabel: '可获得',
    outputToken: 'FTC',
    placeholder: '最小兑换 1',
    recordTitle: '兑换记录',
    tabLabel: '猜奖币兑换',
  },
  wallet: {
    actionText: '存入钱包',
    balanceLabel: '可提',
    cardEyebrow: '存入比例',
    cardTitle: '1 FTC = 1 DW20',
    confirmAmountLabel: '存入数量',
    heroEyebrow: '奖金存入',
    heroTitle: '存入无链钱包',
    heroSubtitle: '将您的 FTC 奖金资产提现到无链钱包',
    inputLabel: '输入存入数量',
    inputToken: 'FTC',
    outputLabel: '预计到账',
    outputToken: 'DW20',
    placeholder: '最小存入 1',
    recordTitle: '存入记录',
    tabLabel: '奖金存入钱包',
  },
} as const

export const recordTabs = [
  { label: '全部记录', value: 'all' },
  { label: '猜奖币兑换', value: 'exchange' },
  { label: '奖金存入钱包', value: 'wallet' },
] as const

export const records = [
  {
    amount: '100,000 DW20',
    direction: 'DW20 → FTC',
    rate: '1 DW20 = 1 FTC',
    received: '100,000 FTC',
    status: '成功',
    time: '2025-12-25 21:09:55',
    title: '猜奖币兑换',
    type: 'exchange',
  },
  {
    amount: '100,000 FTC',
    direction: 'FTC → DW20',
    rate: '1 FTC = 1 DW20',
    received: '100,000 DW20',
    status: '成功',
    time: '2025-12-25 21:09:55',
    title: '奖金存入钱包',
    type: 'wallet',
  },
  {
    amount: '12,800 FTC',
    direction: 'FTC → DW20',
    rate: '1 FTC = 1 DW20',
    received: '12,800 DW20',
    status: '成功',
    time: '2025-12-21 18:32:10',
    title: '奖金存入钱包',
    type: 'wallet',
  },
] as const

export type Mode = keyof typeof modes
export type Page = 'home' | 'records'
export type RecordFilter = (typeof recordTabs)[number]['value']
export type RecordItem = (typeof records)[number]
