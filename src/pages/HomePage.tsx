import axios from "axios";
import { message } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { availableAmount, modes, type Mode } from "../data/exchange";
import { getBridgeApiUrl, getWalletApiUrl, rpcUrl } from "../lib/api";
import { runOnKeyboardClick } from "../lib/keyboard";
import {
    fetchWalletInfo,
    getStoredWalletAccountId,
    getStoredWalletAddress,
} from "../lib/wallet";
import * as miniProgramApi from "mini-program-api";

type HomePageProps = {
    onOpenRecords: () => void;
};

type NoChainWindow = Window & {
    noChain?: unknown;
};

type AccountBalance = {
    coin: string;
    available_balance: string;
    total_balance: string;
};

type AccountResponse = {
    success?: boolean;
    data?: {
        balance?: AccountBalance[];
    };
};

type AuthResponse = {
    success?: boolean;
    data?: {
        accountId?: string;
    };
};

type NoChainProvider = InstanceType<typeof miniProgramApi.BrowserProvider>;

type ContractTxRawParams = {
    receiverId: string;
    sender_account_id: string;
    actions: {
        method_name: string;
        args: {
            evm_address: string;
        };
        max_gas: number;
        amount: string;
        symbol: string;
        fee_symbol: string;
    };
};

type SendContractTxRaw = (
    params: ContractTxRawParams,
) => ReturnType<NoChainProvider["sendContractTxRaw"]>;

type ExchangePreviewRecord = {
    chainless_tx_hash: string;
    wulian_account: string;
    evm_address: string;
    amount: string;
    from_amount?: string;
    to_amount?: string;
    deposit_time: number;
    deposit_seq: number;
    status?: string;
    failed_reason?: string | null;
};

type ExchangePreviewResponse = {
    items: ExchangePreviewRecord[];
};

type DepositStatusResponse = {
    status?: string;
};

type RpcResponse = {
    status?: number;
    result?: {
        fees?: Array<string | bigint | number>;
        result?: {
            fees?: Array<string | bigint | number>;
        };
    };
};

const exchangePreviewRequests = new Map<string, Promise<ExchangePreviewResponse>>();

const wait = (delay: number) =>
    new Promise((resolve) => {
        window.setTimeout(resolve, delay);
    });

function parseNearAmount(amountText: string) {
    const [integerPart = "0", fractionPart = ""] = amountText.trim().split(".");
    const normalizedInteger = integerPart.replace(/\D/g, "") || "0";
    const normalizedFraction = fractionPart.replace(/\D/g, "").slice(0, 24);
    const paddedFraction = normalizedFraction.padEnd(24, "0");

    return `${BigInt(normalizedInteger) * 10n ** 24n + BigInt(paddedFraction)}`;
}

function formatNearAmount(amountText: string) {
    const value = BigInt(amountText);
    const base = 10n ** 24n;
    const integer = value / base;
    const fraction = value % base;

    if (fraction === 0n) {
        return integer.toString();
    }

    const fractionText = fraction.toString().padStart(24, "0").replace(/0+$/, "");

    return `${integer}.${fractionText}`;
}

// 兑换前调用链 RPC 预估手续费，弹框里的“手续费”和“共计支付”都来自这里。
async function estimateTransferFee({
    accountId,
    amount,
    receiverId,
}: {
    accountId: string;
    amount: string;
    receiverId: string;
}) {
    try {
        const response = await axios.post<RpcResponse>(
            rpcUrl,
            {
                jsonrpc: "2.0",
                id: "dontcare",
                method: "query",
                params: {
                    request_type: "transfer_fee",
                    finality: "final",
                    account_id: accountId,
                    receiver_id: receiverId,
                    symbol: "TDW20",
                    amount: parseNearAmount(amount),
                    fee_symbol: ["TDW20"],
                },
            },
            {
                timeout: 50000,
            },
        );

        const rawFee =
            response.data.result?.fees?.[0] ??
            response.data.result?.result?.fees?.[0] ??
            "0";
        const feeString = typeof rawFee === "bigint" ? rawFee.toString() : String(rawFee);
        const formattedFee = formatNearAmount(feeString);
        const fee = Math.ceil(Number.parseFloat(formattedFee));

        return Number.isFinite(fee) ? fee : 0;
    } catch (error) {
        console.error("estimate transfer fee failed:", error);
        return 0;
    }
}

// 广播后后端需要异步落库，这里按 0.7 秒一次轮询，最多查询 40 次。
async function pollDepositStatus(chainlessTxHash: string) {
    const depositStatusUrl = getWalletApiUrl(
        `/pub/bridge/deposit?chainless_tx_hash=${encodeURIComponent(chainlessTxHash)}`,
    );

    for (let retryCount = 0; retryCount < 40; retryCount += 1) {
        try {
            const response = await axios.get<DepositStatusResponse>(depositStatusUrl);
            const status = response.data.status ?? "";

            console.log("deposit status response:", response.data);

            if (status === "success") {
                return true;
            }

            if (status === "error") {
                return false;
            }
        } catch (error) {
            console.error("deposit status request failed:", error);
        }

        if (retryCount < 39) {
            await wait(700);
        }
    }

    return false;
}

// 首页只展示最近 5 条猜奖币兑换记录，完整列表在 RecordsPage 中按分页加载。
async function fetchExchangePreviewRecords(walletAddress: string) {
    const exchangePreviewUrl = getBridgeApiUrl(
        `/pub/bridge/deposits?evm_address=${encodeURIComponent(walletAddress)}&page=1&page_size=5`,
    );
    const existingRequest = exchangePreviewRequests.get(exchangePreviewUrl);

    if (existingRequest) {
        return existingRequest;
    }

    const request = axios
        .get<ExchangePreviewResponse>(exchangePreviewUrl)
        .then((response) => response.data)
        .finally(() => {
            exchangePreviewRequests.delete(exchangePreviewUrl);
        });

    exchangePreviewRequests.set(exchangePreviewUrl, request);

    return request;
}

function HomePage({ onOpenRecords }: HomePageProps) {
    const [amount, setAmount] = useState("");
    const [activeMode, setActiveMode] = useState<Mode>("exchange");
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isEstimatingFee, setIsEstimatingFee] = useState(false);
    const [isSubmittingExchange, setIsSubmittingExchange] = useState(false);
    const [estimatedFeeAmount, setEstimatedFeeAmount] = useState(0);
    const [dw20AvailableBalance, setDw20AvailableBalance] = useState("0");
    const [exchangePreviewRecords, setExchangePreviewRecords] = useState<
        ExchangePreviewRecord[]
    >([]);
    const [isExchangePreviewLoading, setIsExchangePreviewLoading] = useState(false);
    const [walletAccountId, setWalletAccountId] = useState(() =>
        getStoredWalletAccountId(),
    );
    const [walletAddress, setWalletAddress] = useState(() => getStoredWalletAddress());
    const [hasCheckedWallet, setHasCheckedWallet] = useState(false);
    const noChainProvider = useRef<NoChainProvider | null>(null);
    const mode = modes[activeMode];
    const receiverId = "dw20-lock.contract";

    useEffect(() => {
        let isMounted = true;
        let retryTimer: number | undefined;

        const initNoChain = async () => {
            try {
                const noChain = (window as NoChainWindow).noChain;

                if (!noChain) {
                    retryTimer = window.setTimeout(initNoChain, 800);
                    return;
                }

                noChainProvider.current = new miniProgramApi.BrowserProvider(noChain);
                // 先拿无链授权账号，再用 accountId 查询钱包地址；没有钱包地址时不请求记录接口。
                const userInfo = (await noChainProvider.current.requestAuth({
                    type: "auth_account",
                    scope: "userInfo",
                    actions: [],
                })) as AuthResponse;

                console.log("result", userInfo);
                console.log("result", userInfo.data?.accountId);

                if (userInfo.success) {
                    const accountId = userInfo.data?.accountId?.trim() ?? "";

                    if (isMounted) {
                        setWalletAccountId(accountId);
                    }

                    if (accountId) {
                        try {
                            const walletInfo = await fetchWalletInfo(accountId);
                            const nextWalletAddress =
                                walletInfo.walletAddress?.trim() ?? "";

                            console.log("wulian wallet response:", walletInfo);

                            if (isMounted) {
                                setWalletAddress(nextWalletAddress);
                                setHasCheckedWallet(true);
                            }

                            if (walletInfo.status === "NoRegistered" || !nextWalletAddress) {
                                message.warning("用户未注册，请先注册钱包");
                            }
                        } catch (error) {
                            console.error("wulian wallet request failed:", error);

                            if (isMounted) {
                                setWalletAddress("");
                                setHasCheckedWallet(true);
                            }
                        }
                    } else if (isMounted) {
                        setWalletAddress("");
                        setHasCheckedWallet(true);
                    }

                    // getAccount 返回的是无链账户资产，这里只取 DW20 可用余额限制输入上限。
                    const account =
                        (await noChainProvider.current.getAccount()) as AccountResponse;

                    console.log("getAccount", JSON.stringify(account));

                    const dw20Balance = account.data?.balance?.find(
                        (item) => item.coin === "DW20",
                    );

                    if (isMounted) {
                        setDw20AvailableBalance(dw20Balance?.available_balance ?? "0");
                    }
                }
            } catch (error) {
                console.error("noChain init failed:", error);
            }
        };

        void initNoChain();

        return () => {
            isMounted = false;
            if (retryTimer) {
                window.clearTimeout(retryTimer);
            }
        };
    }, []);

    useEffect(() => {
        if (activeMode !== "exchange") {
            return;
        }

        if (!hasCheckedWallet) {
            return;
        }

        if (!walletAddress) {
            queueMicrotask(() => {
                setExchangePreviewRecords([]);
                setIsExchangePreviewLoading(false);
            });
            return;
        }

        let isMounted = true;

        const loadExchangePreviewRecords = async () => {
            try {
                setIsExchangePreviewLoading(true);
                const response = await fetchExchangePreviewRecords(walletAddress);

                console.log("exchange preview records:", response);

                if (isMounted) {
                    setExchangePreviewRecords(response.items ?? []);
                }
            } catch (error) {
                console.error("exchange preview records request failed:", error);
                if (isMounted) {
                    setExchangePreviewRecords([]);
                }
            } finally {
                if (isMounted) {
                    setIsExchangePreviewLoading(false);
                }
            }
        };

        void loadExchangePreviewRecords();

        return () => {
            isMounted = false;
        };
    }, [activeMode, hasCheckedWallet, walletAddress]);

    const maxInputAmount = useMemo(() => {
        if (activeMode === "exchange") {
            const dw20Balance = Number(dw20AvailableBalance);

            if (Number.isFinite(dw20Balance) && dw20Balance >= 0) {
                return Math.floor(dw20Balance);
            }
        }

        return Math.floor(availableAmount);
    }, [activeMode, dw20AvailableBalance]);

    const availableDisplayAmount = useMemo(() => {
        if (activeMode === "exchange") {
            return Number(dw20AvailableBalance).toLocaleString(undefined, {
                maximumFractionDigits: 8,
            });
        }

        return availableAmount.toLocaleString();
    }, [activeMode, dw20AvailableBalance]);

    const updateAmount = (nextAmount: string) => {
        const integerAmount = nextAmount.replace(/\D/g, "").replace(/^0+(?=\d)/, "");

        if (integerAmount === "") {
            setAmount("");
            return;
        }

        const value = Number(integerAmount);

        if (!Number.isFinite(value) || value < 0) {
            return;
        }

        if (value > maxInputAmount) {
            setAmount(String(maxInputAmount));
            return;
        }

        setAmount(integerAmount);
    };

    const receiveAmount = useMemo(() => {
        const value = Number(amount);

        if (!Number.isFinite(value) || value <= 0) {
            return "";
        }

        return String(value);
    }, [amount]);

    const paymentAmount = useMemo(() => {
        const value = Number(amount);

        if (!Number.isFinite(value) || value <= 0) {
            return "";
        }

        return String(value);
    }, [amount]);

    const totalPayment = useMemo(() => {
        const value = Number(paymentAmount);

        if (!Number.isFinite(value) || value <= 0) {
            return estimatedFeeAmount;
        }

        return value + estimatedFeeAmount;
    }, [estimatedFeeAmount, paymentAmount]);

    const canExchange = Number(receiveAmount) >= 1;
    const switchMode = (nextMode: Mode) => {
        if (isSubmittingExchange) {
            return;
        }

        setActiveMode(nextMode);
        setAmount("");
        setIsConfirmOpen(false);
        setEstimatedFeeAmount(0);
    };

    const openConfirmDialog = async () => {
        if (!canExchange || isSubmittingExchange || isEstimatingFee) {
            return;
        }

        if (!walletAccountId) {
            message.warning("钱包账号未初始化");
            return;
        }

        setIsEstimatingFee(true);

        try {
            // 打开二次确认弹框前先预估手续费，避免弹框展示固定假数据。
            const fee = await estimateTransferFee({
                accountId: walletAccountId,
                amount: paymentAmount,
                receiverId,
            });

            setEstimatedFeeAmount(fee);
            setIsConfirmOpen(true);
        } finally {
            setIsEstimatingFee(false);
        }
    };

 const sendContractMethod = async () => {
        if (!noChainProvider.current) {
            message.warning("钱包插件未初始化");
            return false;
        }

        if (!walletAddress) {
            message.warning("用户未注册，请先注册钱包");
            return false;
        }

        if (!walletAccountId) {
            message.warning("钱包账号未初始化");
            return false;
        }

        const opt = {
            receiverId,
            sender_account_id: walletAccountId,
            actions: {
                method_name: "deposit",
                args: {
                    evm_address: walletAddress,
                },
                max_gas: 300000000000000,
                amount: "100000000000000000000000000",
                symbol: "TDW20",
                fee_symbol: "TDW20",
            },
        } satisfies ContractTxRawParams;

        console.log("opt", opt);


        try {
            // SDK 类型声明写的是 actions 数组，但当前运行时要求对象；这里保留对象并只适配 TS 类型。
            const contractMethod = await (
                noChainProvider.current.sendContractTxRaw as unknown as SendContractTxRaw
            ).call(noChainProvider.current, opt);
            console.log("sendContractTxRaw", contractMethod);

            if (!contractMethod.success || contractMethod.error) {
                message.error("交易签名失败，请重试");
                return false;
            }

            console.log('contractMethod.data.txRaw',contractMethod.data.txRaw)
            const sendTxraw = await noChainProvider.current.sendBroadcastTx({
                txRaw: contractMethod.data.txRaw,
            });

            console.log("sendBroadcastTx", sendTxraw);

            if (!sendTxraw.success || !sendTxraw.data.success) {
                message.error("交易广播失败，请重试");
                return false;
            }

            console.log('sendTxraw.data.hash',sendTxraw.data.hash)
            const getHash = await noChainProvider.current.sendBroadcastHash({
                hash: sendTxraw.data.hash,
            });
            console.log("getHash", getHash);

            if (!getHash.success || !getHash.data.success) {
                message.error("交易确认失败，请重试");
                return false;
            }

            // 钱包确认成功不代表后端充值状态已完成，还需要用交易 hash 轮询后端状态。
            const isDepositSuccess = await pollDepositStatus(sendTxraw.data.hash);

            if (isDepositSuccess) {
                console.log("合约流程走完毕!");
                return true;
            }

            message.error("交易确认失败，请稍后查看记录");
            return false;
        } catch (error) {
            console.log('3333333')
            console.error("exchange submit failed:", error);
            message.error("兑换提交失败，请重试");
            return false;
        }
    };

    const submitExchange = async () => {
        if (isSubmittingExchange) {
            return;
        }

        setIsSubmittingExchange(true);
        setIsConfirmOpen(false);

        try {
            const isSuccess = await sendContractMethod();

            if (isSuccess) {
                message.success("兑换提交成功");
                setAmount("");

                if (activeMode === "exchange" && walletAddress) {
                    try {
                        const response = await fetchExchangePreviewRecords(walletAddress);
                        setExchangePreviewRecords(response.items ?? []);
                    } catch (error) {
                        console.error("refresh exchange preview records failed:", error);
                    }
                }
            }
        } finally {
            setIsSubmittingExchange(false);
        }
    };

    const getTabClassName = (tabMode: Mode) =>
        [
            "relative z-10 flex min-h-10.5 items-center justify-center rounded-[14px]",
            "border-0 bg-transparent px-3 text-[15px] leading-[1.1] font-bold",
            "transition-colors duration-300 ease-out",
            activeMode === tabMode ? "text-white" : "text-[#727b90]",
        ].join(" ");

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
                    <h1 className="m-0 text-center text-lg leading-none font-semibold">
                        兑换
                    </h1>
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
                            "absolute top-[5px] bottom-[5px] left-[5px] w-[calc((100%-16px)/2)]",
                            "rounded-[14px] bg-[#172033] shadow-[0_10px_22px_rgba(23,32,51,0.2)]",
                            "transition-transform duration-300 ease-out",
                            activeMode === "wallet"
                                ? "translate-x-[calc(100%+6px)]"
                                : "translate-x-0",
                        ].join(" ")}
                        aria-hidden="true"
                    ></div>
                    <div
                        className={getTabClassName("exchange")}
                        role="button"
                        tabIndex={0}
                        aria-pressed={activeMode === "exchange"}
                        onClick={() => switchMode("exchange")}
                        onKeyDown={runOnKeyboardClick(() => switchMode("exchange"))}
                    >
                        {modes.exchange.tabLabel}
                    </div>
                    <div
                        className={getTabClassName("wallet")}
                        role="button"
                        tabIndex={0}
                        aria-pressed={activeMode === "wallet"}
                        onClick={() => switchMode("wallet")}
                        onKeyDown={runOnKeyboardClick(() => switchMode("wallet"))}
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
                            {mode.balanceLabel} {availableDisplayAmount} {mode.inputToken}
                        </span>
                    </div>
                    <div className="mb-[18px] grid min-h-[58px] grid-cols-[minmax(0,1fr)_auto] items-center rounded-[18px] border border-[#e9edf5] bg-[#f8faff] px-4 focus-within:border-[rgba(79,125,241,0.42)] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(79,125,241,0.1)]">
                        <input
                            className="min-w-0 border-0 bg-transparent text-2xl font-extrabold text-[#172033] outline-none placeholder:text-[#b6bdcb]"
                            id="ftc-amount"
                            inputMode="numeric"
                            min="1"
                            max={maxInputAmount}
                            pattern="[0-9]*"
                            placeholder={mode.placeholder}
                            type="text"
                            value={amount}
                            onChange={(event) => updateAmount(event.target.value)}
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
                            {receiveAmount || "0"}
                        </output>
                        <strong className="text-[15px] font-black text-[#172033]">
                            {mode.outputToken}
                        </strong>
                    </div>

                    <div
                        className={[
                            "mt-0.5 mb-7 grid min-h-[52px] w-full place-items-center rounded-[18px]",
                            "border-0 text-[17px] font-[850] transition-[background,box-shadow,transform]",
                            "duration-200 active:translate-y-px",
                            canExchange && !isSubmittingExchange && !isEstimatingFee
                                ? "cursor-pointer bg-linear-to-br from-[#35c4a0] to-[#2f8df5] text-white shadow-[0_14px_26px_rgba(47,141,245,0.24)]"
                                : "cursor-not-allowed bg-[#e2e6ee] text-[#a5adbd] shadow-none",
                        ].join(" ")}
                        role="button"
                        tabIndex={canExchange && !isSubmittingExchange && !isEstimatingFee ? 0 : -1}
                        aria-disabled={!canExchange || isSubmittingExchange || isEstimatingFee}
                        onClick={() => {
                            void openConfirmDialog();
                        }}
                        onKeyDown={runOnKeyboardClick(
                            () => {
                                void openConfirmDialog();
                            },
                            !canExchange || isSubmittingExchange || isEstimatingFee,
                        )}
                    >
                        {isEstimatingFee ? "预估手续费中..." : mode.actionText}
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

                    <ExchangePreviewList
                        records={activeMode === "exchange" ? exchangePreviewRecords : []}
                        isLoading={
                            activeMode === "exchange" && isExchangePreviewLoading
                        }
                    />
                </div>
            </section>

            {isConfirmOpen && (
                <ConfirmDialog
                    feeAmount={estimatedFeeAmount}
                    amountLabel={mode.confirmAmountLabel}
                    modeLabel={activeMode === "wallet" ? "确认存入" : "确认兑换"}
                    paymentAmount={paymentAmount}
                    totalPayment={totalPayment}
                    token={mode.inputToken}
                    isSubmitting={isSubmittingExchange}
                    onCancel={() => {
                        if (!isSubmittingExchange) {
                            setIsConfirmOpen(false);
                        }
                    }}
                    onConfirm={() => {
                        void submitExchange();
                    }}
                />
            )}

            {isSubmittingExchange && <SubmittingOverlay />}
        </main>
    );
}

function ExchangePreviewList({
    records,
    isLoading,
}: {
    records: ExchangePreviewRecord[];
    isLoading: boolean;
}) {
    if (isLoading) {
        return (
            <div
                className="grid min-h-[132px] place-items-center rounded-[18px] border border-dashed border-[#d9deea] bg-[#fbfcff] text-[15px] font-semibold text-[#8a92a6]"
                id="records"
            >
                正在加载记录...
            </div>
        );
    }

    if (records.length === 0) {
        return <HomeEmptyRecords />;
    }

    return (
        <div
            className="space-y-2.5 rounded-[18px] border border-[#e9edf5] bg-[#fbfcff] p-2.5"
            id="records"
        >
            {records.map((record) => (
                <article
                    className="overflow-hidden rounded-[16px] bg-white shadow-[0_8px_22px_rgba(36,48,76,0.06)]"
                    key={`${record.chainless_tx_hash}-${record.deposit_seq}`}
                >
                    <header className="flex items-center justify-between gap-3 border-b border-[#f0f2f7] px-3.5 py-3">
                        <div className="flex items-center gap-2">
                            <span className="h-5 w-1.25 rounded-full bg-[#23b594]"></span>
                            <strong className="text-sm font-black text-[#172033]">
                                猜奖币兑换
                            </strong>
                        </div>
                        <span className={getStatusClassName(record.status)}>
                            {formatStatus(record.status)}
                        </span>
                    </header>
                    <dl className="grid grid-cols-2 gap-2 px-3.5 py-3 text-xs font-bold">
                        <dt className="text-[#8a92a6]">兑换方向</dt>
                        <dd className="m-0 text-right text-[#222b3d]">DW20 → FTC</dd>
                        <span className="text-[#8a92a6]">兑换数量</span>
                        <dd className="m-0 text-right text-[#222b3d]">
                            {formatTokenAmount(record.from_amount ?? record.amount)} DW20
                        </dd>
                        <dt className="text-[#8a92a6]">获得数量</dt>
                        <dd className="m-0 text-right text-[#222b3d]">
                            {formatTokenAmount(record.to_amount ?? record.amount)} FTC
                        </dd>
                        <dt className="text-[#8a92a6]">时间</dt>
                        <dd className="m-0 text-right text-[#222b3d]">
                            {formatTimestamp(record.deposit_time)}
                        </dd>
                    </dl>
                </article>
            ))}
        </div>
    );
}

function HomeEmptyRecords() {
    return (
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
    );
}

function SubmittingOverlay() {
    return (
        <div
            className="fixed inset-0 z-[60] grid place-items-center bg-white/10 px-8 backdrop-blur-[1px]"
            role="alert"
            aria-live="assertive"
        >
            <div className="grid h-[160px] w-[160px] place-items-center rounded-[28px] bg-[#3f3f3f]/92 text-white shadow-[0_22px_70px_rgba(15,23,42,0.28)]">
                <div className="flex flex-col items-center">
                    <span
                        className="mb-7 h-[38px] w-[38px] animate-spin rounded-full border-[4px] border-white/20 border-t-white"
                        aria-hidden="true"
                    ></span>
                    <p className="m-0 text-[16px] leading-none font-medium tracking-normal">
                        提交质押中..
                    </p>
                </div>
            </div>
        </div>
    );
}

type ConfirmDialogProps = {
    amountLabel: string;
    feeAmount: number;
    isSubmitting: boolean;
    modeLabel: string;
    paymentAmount: string;
    token: string;
    totalPayment: number;
    onCancel: () => void;
    onConfirm: () => void;
};

function ConfirmDialog({
    amountLabel,
    feeAmount,
    isSubmitting,
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
            onClick={() => {
                if (!isSubmitting) {
                    onCancel();
                }
            }}
        >
            <section
                className="w-full  rounded-t-[30px] bg-white p-5 shadow-[0_-24px_70px_rgba(15,23,42,0.24)] [animation:confirm-sheet-in_220ms_ease-out] sm:rounded-[30px]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="relative pb-5 text-center">
                    <div
                        className={[
                            "absolute top-0 right-0 grid h-9 w-9 place-items-center rounded-full",
                            "bg-[#f4f6fb] text-2xl leading-none text-[#687386]",
                            isSubmitting ? "cursor-not-allowed opacity-45" : "cursor-pointer",
                        ].join(" ")}
                        role="button"
                        tabIndex={isSubmitting ? -1 : 0}
                        aria-label="关闭弹框"
                        aria-disabled={isSubmitting}
                        onClick={() => {
                            if (!isSubmitting) {
                                onCancel();
                            }
                        }}
                        onKeyDown={runOnKeyboardClick(onCancel, isSubmitting)}
                    >
                        ×
                    </div>
                    <h2
                        className="m-0 text-[22px] leading-none font-black text-[#172033]"
                        id="confirm-title"
                    >
                        {isSubmitting ? "兑换中..." : modeLabel}
                    </h2>
                    <p className="mt-2 mb-0 text-sm font-semibold text-[#8a92a6]">
                        {isSubmitting ? "正在提交交易，请勿关闭页面" : "请确认本次交易明细"}
                    </p>
                </header>

                <div>
                    {isSubmitting && (
                        <div className="mb-4 flex items-center gap-3 rounded-[18px] bg-[#eef4ff] px-4 py-3 text-sm font-bold text-[#1f55ff]">
                            <span
                                className="h-5 w-5 animate-spin rounded-full border-2 border-[#1f55ff]/20 border-t-[#1f55ff]"
                                aria-hidden="true"
                            ></span>
                            正在兑换中，请等待钱包确认结果
                        </div>
                    )}

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
                            className={[
                                "grid min-h-[50px] place-items-center rounded-[16px]",
                                "bg-[#f1f4f9] text-[16px] font-extrabold text-[#394255]",
                                "transition-transform duration-200 active:translate-y-px",
                                isSubmitting ? "cursor-not-allowed opacity-55" : "cursor-pointer",
                            ].join(" ")}
                            role="button"
                            tabIndex={isSubmitting ? -1 : 0}
                            aria-disabled={isSubmitting}
                            onClick={() => {
                                if (!isSubmitting) {
                                    onCancel();
                                }
                            }}
                            onKeyDown={runOnKeyboardClick(onCancel, isSubmitting)}
                        >
                            取消
                        </div>
                        <div
                            className={[
                                "grid min-h-[50px] place-items-center rounded-[16px]",
                                "text-[16px] font-extrabold text-white shadow-[0_12px_24px_rgba(23,32,51,0.22)]",
                                "transition-transform duration-200 active:translate-y-px",
                                isSubmitting
                                    ? "cursor-not-allowed bg-[#7f8899]"
                                    : "cursor-pointer bg-[#172033]",
                            ].join(" ")}
                            role="button"
                            tabIndex={isSubmitting ? -1 : 0}
                            aria-disabled={isSubmitting}
                            onClick={() => {
                                if (!isSubmitting) {
                                    onConfirm();
                                }
                            }}
                            onKeyDown={runOnKeyboardClick(onConfirm, isSubmitting)}
                        >
                            {isSubmitting ? "提交中..." : "确定"}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

function ConfirmRow({
    label,
    value,
    valueClassName = "text-[#172033]",
}: {
    label: string;
    value: string;
    valueClassName?: string;
}) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-[#edf0f6] py-4 last:border-b-0">
            <span className="text-[15px] font-bold text-[#7b8498]">{label}</span>
            <strong className={`text-right text-[16px] font-black ${valueClassName}`}>
                {value}
            </strong>
        </div>
    );
}

function formatTokenAmount(amount: string) {
    try {
        const value = BigInt(amount);
        const base = 10n ** 18n;
        const integer = value / base;
        const fraction = value % base;

        if (fraction === 0n) {
            return integer.toLocaleString();
        }

        const fractionText = fraction.toString().padStart(18, "0").replace(/0+$/, "");

        return `${integer.toLocaleString()}.${fractionText}`;
    } catch {
        return amount;
    }
}

function getStatusClassName(status = "success") {
    const base = "rounded-full px-2 py-0.5 text-[11px] font-black";

    if (status === "success") {
        return `${base} bg-[#eaf8f4] text-[#23a57f]`;
    }

    if (status === "error") {
        return `${base} bg-[#fff1f0] text-[#d93026]`;
    }

    if (status === "pending") {
        return `${base} bg-[#fff7e6] text-[#d46b08]`;
    }

    if (status === "in_progress") {
        return `${base} bg-[#eef4ff] text-[#1f55ff]`;
    }

    return `${base} bg-[#f1f4f9] text-[#6f7788]`;
}

function formatStatus(status = "success") {
    const statusMap: Record<string, string> = {
        error: "失败",
        in_progress: "处理中",
        pending: "待处理",
        success: "成功",
    };

    return statusMap[status] ?? status;
}

function formatTimestamp(timestamp: number) {
    if (!timestamp) {
        return "-";
    }

    return new Date(timestamp * 1000)
        .toLocaleString("zh-CN", {
            hour12: false,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        })
        .replace(/\//g, "-");
}

export default HomePage;
