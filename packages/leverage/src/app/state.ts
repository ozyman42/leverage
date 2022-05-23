
export type AppState = AppState3;

export type RemakeParams = {
    avgLoss: number;
    avgGainPerLossFactor: number;
    stopLoss: number;
    goal: number;
    start: number;
    winRate: number;
}

type AppState3 = {
    stagingGround: Trade[];
    active: Record<string, Trade[]>;
    name: string;
    timezone: string;
    selectedPortfolio: string;
    version: 3;
    encryption: {
        pubkey: string;
        bybit: string;
    } | undefined;
    remakeParams: RemakeParams;
}

type AppState2 = {
    stagingGround: Trade[];
    active: Record<string, Trade[]>;
    name: string;
    timezone: string;
    selectedPortfolio: string;
    version: 2;
    encryption: {
        pubkey: string;
        bybit: string;
    } | undefined;
    remakeParams: {
        avgWin: number;
        avgLoss: number;
    }
};

type AppState1 = {
    stagingGround: Trade[];
    active: Record<string, Trade[]>;
    name: string;
    timezone: string;
    selectedPortfolio: string;
    version: 1;
    // We use the Ethereum Pubkey to encrypt an AES private key by
    encryption: {
        pubkey: string;
        bybit: string;
    } | undefined;
}

type AppState0 = {
    stagingGround: Trade[];
    active: Record<string, Trade[]>;
    name: string;
    timezone: string;
    selectedPortfolio: string;
}

type SomeAppState = AppState0 | AppState1 | AppState2 | AppState3;
type VersionedAppState = AppState1 | AppState2 | AppState3;

export enum UpdateableFields {
    StartEquity = 'Start Equity',
    EntryPrice = 'Entry Price',
    StopPrice = 'Stop Price',
    IdealExitPrice = 'Ideal Exit',
    Size = 'Size',
}

export enum Direction {
    short = 'short',
    long = 'long'
}

export type Trade = {
    [UpdateableFields.StartEquity]: number;
    [UpdateableFields.EntryPrice]: number;
    [UpdateableFields.StopPrice]: number;
    [UpdateableFields.IdealExitPrice]: number;
    [UpdateableFields.Size]: number;
    started?: number;
    finished?: {
        at: number;
        stopped: boolean;
        notes?: string;
    };
    locked: boolean;
}

const LOCAL_STORAGE_KEY = "leverage-calculator";

export type TradeInputs = {[f in UpdateableFields]: string};

const defaultName = "My Trades";
const defaultPortfolio = "My Portfolio";
const defaultTimeZone = 'America/Los_Angeles';
const DEFAULT_REMAKE = { avgWin: 40, avgLoss: 10 };
const DEFAULT_REMAKE_2: RemakeParams = { 
    avgLoss: DEFAULT_REMAKE.avgLoss, avgGainPerLossFactor: DEFAULT_REMAKE.avgWin / DEFAULT_REMAKE.avgLoss,
    stopLoss: 10, goal: 1000000, start: 100, winRate: 80
};
const INITIAL_STATE: AppState = {
    stagingGround: [], active: {[defaultPortfolio]: []}, name: defaultName, timezone: defaultTimeZone, selectedPortfolio: defaultPortfolio,
    version: 3, encryption: undefined, remakeParams: DEFAULT_REMAKE_2
};

export function saveState(state: AppState) {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
}

export function getState(): AppState {
    const current = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (current === null) {
        saveState(INITIAL_STATE);
        return INITIAL_STATE;
    } else {
        const parsed: SomeAppState = JSON.parse(current);
        const migrated: AppState = migrate(parsed);
        saveState(migrated);
        return migrated;
    }
}

export function clearState() {
    saveState(INITIAL_STATE);
}

function migrate(someAppState: SomeAppState): AppState {
    let current = someAppState;
    
    // V0 to V1
    if (!('version' in current)) {
        const v1: AppState1 = {...someAppState, version: 1, encryption: undefined};
        current = v1;
    }
    
    if ('version' in current) {
        let versioned: VersionedAppState = current;
        if (versioned.version === 1) {
            const v2: AppState2 = {...current, version: 2, remakeParams: DEFAULT_REMAKE};
            versioned = v2;
        }
        if (versioned.version === 2) {
            const v3: AppState3 = {...versioned, version: 3, remakeParams: {
                ...DEFAULT_REMAKE_2,
                avgLoss: versioned.remakeParams.avgLoss,
                avgGainPerLossFactor: versioned.remakeParams.avgWin / versioned.remakeParams.avgLoss,
            } };
            versioned = v3;
        }
        if (versioned.version === 3) {
            return versioned;
        }
    }

    throw new Error("Version not supported");
}