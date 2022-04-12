import React, { useState } from 'react';

enum UpdateableFields {
    StartEquity = 'Start Equity',
    EntryPrice = 'Entry Price',
    StopPrice = 'Stop Price',
    IdealExitPrice = 'Ideal Exit',
    Size = 'Size',
}

type Trade = {
    [UpdateableFields.StartEquity]: number;
    [UpdateableFields.EntryPrice]: number;
    [UpdateableFields.StopPrice]: number;
    [UpdateableFields.IdealExitPrice]: number;
    [UpdateableFields.Size]: number;
    started?: number;
    finished?: number;
}

enum Direction {
    short = 'short',
    long = 'long'
}

function dec2(input: number): number {
    return Math.round(input * 100) / 100;
}

function setIfNumeric(value: string, setter: (input: string) => void) {
    if (value === "" || isNumeric(value)) {
        setter(value);
    }
}

function isNumeric(value: string) {
    const num = parseFloat(value);
    return (!isNaN(num) && !isNaN(value as any));
}

function getStats(trade: Trade) {
    const entry = trade['Entry Price'];
    const stop = trade['Stop Price'];
    const startEquity = trade['Start Equity'];
    const size = trade['Size'];
    const idealExit = trade['Ideal Exit'];
    const direction = entry < stop ? Direction.short : Direction.long;
    function getEquity(end: number) {
        return direction === Direction.long ?
            size * (end - entry) + startEquity
            :
            size * (entry - end) + startEquity;
    }
    const endEquity = getEquity(idealExit);
    const equityAtStop = getEquity(stop);
    const startLev = (size * entry) / startEquity;
    const endLev = (size * idealExit) / endEquity;
    const stopLev = (size * stop) / equityAtStop;
    const liqPrice = direction === Direction.long ?
        entry - (startEquity / size)
        :
        entry + (startEquity / size)
    ;
    const profitLoss = endEquity - startEquity;
    const change = profitLoss / startEquity;
    const stopLoss = equityAtStop - startEquity;
    const maxLoss = (startEquity - equityAtStop) / startEquity * 100;
    
    // Mango start
    //   TODO: maintenance leverage is 40x for SOL, BTC, and ETH perps but smaller for other perps and operates by a different mechanism for spot (seemingly).
    //         fix this by adding a trading platform input and an asset market.
    const liquidationLeverage = 40;
    const equityDirection = direction === Direction.long ? -1 : 1;
    const mangoLiqPrice = ((equityDirection * liquidationLeverage * entry * size) + (liquidationLeverage * startEquity)) / (size + (liquidationLeverage * size * equityDirection));
    // Mango end
    
    return {entry, stop, startEquity, size, idealExit, direction, endEquity, equityAtStop, startLev, endLev, stopLev, liqPrice, change, stopLoss, maxLoss, mangoLiqPrice, profitLoss};
}

// Features:
// 1. set entry
// 2. set exit
// 3. set stop
// 4. set max loss
// 5. set start equity
// 6. calc end equity, calc size, calc leverage
// 7. mark as in-progess and completed
// 8. mango liquidation

const localstoragekey = "leverage-calculator";
type TradeInputs = {[f in UpdateableFields]: string};
const initFields: TradeInputs = Object.fromEntries(Object.values(UpdateableFields).map(f => [f, ""])) as TradeInputs

export const LeverageCalculator: React.FC = () => {
    const [trades, setTrades] = useState<Trade[]>(JSON.parse(window.localStorage.getItem(localstoragekey) ?? "[]"));
    const [inputs, setInputs] = useState<TradeInputs>(initFields);
    const [editing, setEditing] = useState<number>(-1);
    function clear() {
        setInputs(initFields);
    }
    function saveTrades(newTrades: Trade[]) {
        setTrades(newTrades);
        window.localStorage.setItem(localstoragekey, JSON.stringify(newTrades));
    }
    function inputsToTrade(): Trade {
        return Object.fromEntries(Object.entries(inputs).map(([field, value]) => [field, parseFloat(value)])) as {[f in UpdateableFields]: number};
    }
    function addTrade() {
        if (!active()) return;
        const newTrades = [...trades];
        newTrades.push(inputsToTrade());
        saveTrades(newTrades);
        clear();
    }
    function deleteTrade(index: number) {
        const newTrades = [...trades];
        newTrades.splice(index, 1);
        saveTrades(newTrades);
        if (editing === index) {
            setEditing(-1);
        }
    }
    function duplicateTrade(index: number) {
        const newTrades = [...trades];
        const newTrade = {...trades[index]};
        newTrades.splice(index, 0, newTrade);
        saveTrades(newTrades);
        if (editing > index) {
            setEditing(editing + 1);
        }
    }
    function up(index: number) {
        if (index > 0 && trades.length > 1) {
            const newTrades = [...trades];
            const temp = newTrades[index - 1];
            newTrades[index - 1] = newTrades[index];
            newTrades[index] = temp;
            setEditing(editing - 1);
            saveTrades(newTrades);
        }
    }
    function down(index: number) {
        if (index < trades.length - 1 && trades.length > 1) {
            const newTrades = [...trades];
            const temp = newTrades[index + 1];
            newTrades[index + 1] = newTrades[index];
            newTrades[index] = temp;
            setEditing(editing + 1);
            saveTrades(newTrades);
        }
    }
    function active() {
        return Object.values(inputs).filter(val => val.length === 0).length === 0;
    }
    function oneActive() {
        return Object.values(inputs).filter(val => val.length > 0).length > 0;
    }
    return (
        <div>
            <table>
                <tbody>
                    <tr>
                        <td>
                            <input type="button" value="Clear Trades" onClick={() => { saveTrades([]); }} />
                        </td>
                        {Object.values(UpdateableFields).map(field =>
                            <th key={field}>{field}</th>
                        )}
                        <th>Direction</th>
                        <th>Start Leverage</th>
                        <th>Ideal Exit Leverage</th>
                        <th>Stop Leverage</th>
                        <th>Ideal Exit Equity</th>
                        <th>Stop Equity</th>
                        <th>Ideal Profit</th>
                        <th>Stop Loss</th>
                        <th>Theoretical Liq Price</th>
                        <th>Mango Liq Price</th>
                    </tr>
                    {trades.map((trade, index) => {
                        function updateTrade(newTrade: Trade) {
                            const newTrades = [...trades];
                            newTrades[index] = newTrade;
                            saveTrades(newTrades);
                        }
                        const beingEdited = index === editing;
                        const stats = getStats(trade);
                        return (
                            <tr key={index} style={beingEdited ? {backgroundColor: 'lightblue'} : {}}>
                                <td>
                                    {beingEdited ?
                                        <input type="button" value="☑" onClick={() => { setEditing(-1); }}/>
                                        :
                                        <input type="button" value="✎" onClick={() => { setEditing(index); }} />
                                    }
                                </td>
                                {Object.values(UpdateableFields).map(field =>
                                    <Updateable trade={trade} onChange={updateTrade} k={field} key={field} editing={beingEdited} />
                                )}
                                <th>{stats.direction}</th>
                                <StatsDisplay stats={stats} />
                                <td><button onClick={() => { deleteTrade(index) }}>X</button></td>
                                <td><button onClick={() => { duplicateTrade(index) }}>❐</button></td>
                                {beingEdited && <>                                   
                                    <td><button onClick={() => { up(index) }}><span role="img" aria-label='up'>⇧</span></button></td>
                                    <td><button onClick={() => { down(index) }}><span role="img" aria-label='down'>⇩</span></button></td>
                                </>}
                            </tr>
                        );
                    })}
                    <tr>
                        <td>
                            {oneActive() && <input type="button" value="Clear" onClick={() => {clear()}} />}
                            {active() && <input type="submit" value="Add" onClick={() => {addTrade()}} style={{marginLeft: 5}} />}
                        </td>
                        {Object.values(UpdateableFields).map(field => <FormField key={field} onChange={val => { setInputs({...inputs, [field]: val }) }} value={inputs[field]} />)}
                        <th>{ (isNumeric(inputs['Entry Price']) && isNumeric(inputs['Stop Price'])) ? parseFloat(inputs['Entry Price']) > parseFloat(inputs['Stop Price']) ? Direction.long : Direction.short : "--" }</th>
                        {active() && <StatsDisplay stats={getStats(inputsToTrade())} />}
                    </tr>
                </tbody>
            </table>
        </div>
    )
}

const StatsDisplay: React.FC<{stats: ReturnType<typeof getStats>}> = ({stats}) => <>
    <td>{dec2(stats.startLev)}</td>
    <td>{dec2(stats.endLev)}</td>
    <td>{dec2(stats.stopLev)}</td>
    <td>{dec2(stats.endEquity)}</td>
    <td>{dec2(stats.equityAtStop)}</td>
    <td>{dec2(stats.profitLoss)}<br />({dec2(stats.change * 100)}%)</td>
    <td>{dec2(stats.stopLoss)}<br />({-dec2(stats.maxLoss)}%)</td>
    <td>{dec2(stats.liqPrice)}</td>
    <td>{dec2(stats.mangoLiqPrice)}</td>
</>

const FormField: React.FC<{value: string; onChange: (s: string) => void}> = ({onChange, value}) => {
    return (
        <td>
            <input type="number" value={value} style={{width: INPUT_WIDTH}} onChange={e => { setIfNumeric(e.target.value, v => { onChange(v); }); }} />
        </td>
    )
}

const INPUT_WIDTH = 95;
const PRICE_STEP_SIZE = .3;
const STEP_SIZES: {[f in UpdateableFields]: number} = {
    [UpdateableFields.StartEquity]: 10,
    [UpdateableFields.EntryPrice]: PRICE_STEP_SIZE,
    [UpdateableFields.StopPrice]: PRICE_STEP_SIZE,
    [UpdateableFields.IdealExitPrice]: PRICE_STEP_SIZE,
    [UpdateableFields.Size]: 5
}

const Updateable: React.FC<{trade: Trade; k: UpdateableFields; onChange: (newTrade: Trade) => void; editing: boolean}> = ({trade, k, onChange, editing}) => {
    function send(v: string) {
        if (v.length > 0) {
            const newTrade = {...trade};
            (newTrade as any)[k] = parseFloat(v);
            onChange(newTrade);
        }
    }
    return (
        <td>
            {editing && <form>
                <input type="number" onChange={e => { setIfNumeric(e.target.value, send); }} style={{width: INPUT_WIDTH}} value={trade[k]} step={STEP_SIZES[k]} />
            </form>}
            {!editing && trade[k]}
        </td>
    )
}