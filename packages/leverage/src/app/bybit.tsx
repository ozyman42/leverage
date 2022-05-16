import * as React from 'react';
import * as crypto from 'crypto-js';

const ENDPOINT = "https://leverage-orpin.vercel.app/bybit"; //"https://api.bybit.com";

export const ByBit: React.FC = () => {
    const [apiKey, setApiKey] = React.useState("");
    const [secret, setApiSecret] = React.useState("");
    const [results, setResults] = React.useState("");

    async function fetchPositionData(key: string, secret: string) {
        const serverTimeResponse = await fetch(
            `${ENDPOINT}/v2/public/time`, 
            {mode: 'no-cors'}
        );
        console.log("response done");
        console.log(await serverTimeResponse.statusText);
        const serverTimeData = await serverTimeResponse.json();
        console.log("server time");
        console.log(serverTimeData);
        const serverTime = (serverTimeData).time_now;
        const queryParams = `api_key=${key}&timestamp=${serverTime}`;
        const signature = crypto.HmacSHA256(queryParams, secret).toString();
        const result = await window.fetch(`${ENDPOINT}/private/linear/position/list?${queryParams}&sign=${signature}`);
        const jsonResult = await result.json();
        setResults(JSON.stringify(jsonResult, null, 4));
    }

    return (
        <div>
            Bybit API Key: <input type="text" value={apiKey} onChange={e => {setApiKey(e.target.value)}} /><br />
            Bybit API Secret: <input type="text" value={secret} onChange={e => {setApiSecret(e.target.value)}} /><br />
            {secret.length > 0 && apiKey.length > 0 && <input type="button" value="Fetch Position Data" onClick={() => { fetchPositionData(apiKey, secret); }} />}<br />
            {results.length > 0 && <div style={{background: 'grey', fontFamily: 'monospace', padding: 5}}>
                {results}
            </div>}
        </div>
    );
}