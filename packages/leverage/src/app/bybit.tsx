import * as React from 'react';
import * as crypto from 'crypto-js';

type ByBitPosition = {
    data: {
        user_id: number;
        symbol: string;
        side: string;
        size: number;
        position_value: number,
        entry_price: number;
        liq_price: number;
        bust_price: number;
        leverage: number;
        auto_add_margin: number;
        is_isolated: boolean;
        position_margin: number;
        occ_closing_fee: number;
        realised_pnl: number;
        cum_realised_pnl: number;
        free_qty: number;
        tp_sl_mode: string;
        unrealised_pnl: number;
        deleverage_indicator: number;
        risk_id: number;
        stop_loss: number;
        take_profit: number;
        trailing_stop: number;
        position_idx: number;
        mode: string;
    },
    is_valid: boolean;
};

export const ByBit: React.FC = () => {
    const [apiKey, setApiKey] = React.useState("");
    const [secret, setApiSecret] = React.useState("");
    const [results, setResults] = React.useState("");

    async function fetchPositionData(key: string, secret: string) {
        const serverTimeResponse = await fetch(`/bybit/v2/public/time`);
        const serverTimeData = await serverTimeResponse.json();
        const serverTime = Math.round(parseFloat((serverTimeData).time_now) * 1000);
        console.log("server time", serverTime);
        const queryParams = `api_key=${key}&timestamp=${serverTime}`;
        const signature = crypto.HmacSHA256(queryParams, secret).toString();
        const result = await window.fetch(`/bybit/private/linear/position/list?${queryParams}&sign=${signature}`);
        const jsonResult = await result.json();
        console.log(jsonResult);
        const positions: ByBitPosition[] = jsonResult.result;
        const filteredPositions = positions.filter(position => position.data.size > 0)
            .map(({data: {symbol, size, entry_price, liq_price, leverage, is_isolated, realised_pnl, bust_price}}) => 
                ({symbol, size, entry_price, liq_price, leverage, is_isolated, realised_pnl, bust_price}));
        setResults(JSON.stringify(filteredPositions, null, 4));
    }

    return (
        <div>
            Bybit API Key: <input type="text" value={apiKey} onChange={e => {setApiKey(e.target.value)}} /><br />
            Bybit API Secret: <input type="text" value={secret} onChange={e => {setApiSecret(e.target.value)}} /><br />
            {secret.length > 0 && apiKey.length > 0 && <input type="button" value="Fetch Position Data" onClick={() => { fetchPositionData(apiKey, secret); }} />}<br />
            {results.length > 0 && <div style={{background: 'grey', fontFamily: 'monospace', padding: 5, whiteSpace: 'pre'}}>
                {results}
            </div>}
        </div>
    );
}