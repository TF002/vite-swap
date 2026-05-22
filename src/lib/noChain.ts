import * as miniProgramApi from "mini-program-api";

type NoChainWindow = Window & {
    noChain?: unknown;
};

export type AccountBalance = {
    coin: string;
    available_balance: string;
    total_balance: string;
};

export type AccountResponse = {
    success?: boolean;
    data?: {
        accountId?: string;
        publicKey?: string;
        balance?: AccountBalance[];
    };
};

export type AuthResponse = {
    success?: boolean;
};

export type NoChainProvider = InstanceType<typeof miniProgramApi.BrowserProvider>;

let noChainProvider: NoChainProvider | null = null;

const wait = (delay: number) =>
    new Promise((resolve) => {
        window.setTimeout(resolve, delay);
    });

export const getNoChainProvider = () => noChainProvider;

export const initNoChainProvider = async () => {
    if (noChainProvider) {
        return noChainProvider;
    }

    const noChain = (window as NoChainWindow).noChain;

    if (!noChain) {
        return null;
    }

    noChainProvider = new miniProgramApi.BrowserProvider(noChain);

    return noChainProvider;
};

export const waitForNoChainProvider = async (retryDelay = 800) => {
    let provider = await initNoChainProvider();

    while (!provider) {
        await wait(retryDelay);
        provider = await initNoChainProvider();
    }

    return provider;
};

export const requestNoChainAuth = async () => {
    const provider = await waitForNoChainProvider();

    return provider.requestAuth({
        type: "auth_account",
        scope: "userInfo",
        actions: [],
    }) as Promise<AuthResponse>;
};

export const getNoChainAccount = async () => {
    const provider = await waitForNoChainProvider();

    return provider.getAccount() as Promise<AccountResponse>;
};

export const getAvailableBalance = (
    account: AccountResponse,
    coin: string,
) =>
    account.data?.balance?.find((item) => item.coin === coin)?.available_balance ??
    "0";
