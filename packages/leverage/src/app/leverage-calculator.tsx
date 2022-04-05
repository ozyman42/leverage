import React, { useState } from 'react';

type Trade = {
    startEquity: number;
    entryPrice: number;
    exitPrice: number;
    size: number;
    direction: Direction;
    mangoLiquidationPrice?: number;
}

enum Direction {
    short = 'short',
    long = 'long'
}

function dec2(input: number): number {
    return Math.round(input * 100) / 100;
}

function setIfNumeric(value: string, setter: (input: string) => void) {
    const num = parseFloat(value);
    if (value === "" || (!isNaN(num) && !isNaN(value as any))) {
        setter(value);
    }
}

const localstoragekey = "leverage-calculator";

export const LeverageCalculator: React.FC = () => {
    const [trades, setTrades] = useState<Trade[]>(JSON.parse(window.localStorage.getItem(localstoragekey) ?? "[]"));
    const [startEquity, setStartEquity] = useState("");
    const [entryPrice, setEntryPrice] = useState("");
    const [exitPrice, setExitPrice] = useState("");
    const [size, setSize] = useState("");
    const [direction, setDirection] = useState<Direction>(Direction.long);
    const [mangoLiquidationPrice, setMangoLiquidationPrice] = useState("");
    function clear() {
        setStartEquity("");
        setEntryPrice("");
        setExitPrice("");
        setSize("");
        setMangoLiquidationPrice("");
    }
    function saveTrades(newTrades: Trade[]) {
        setTrades(newTrades);
        window.localStorage.setItem(localstoragekey, JSON.stringify(newTrades));
    }
    function addTrade() {
        if (!active()) return;
        const newTrades = [...trades];
        newTrades.push({
            startEquity: parseFloat(startEquity),
            entryPrice: parseFloat(entryPrice),
            exitPrice: parseFloat(exitPrice),
            size: parseFloat(size),
            direction,
            mangoLiquidationPrice: mangoLiquidationPrice.length ? parseFloat(mangoLiquidationPrice) : undefined
        });
        saveTrades(newTrades);
        setDirection(direction === Direction.long ? Direction.short : Direction.long);
        clear();
    }
    function deleteTrade(index: number) {
        const newTrades = [...trades];
        newTrades.splice(index, 1);
        saveTrades(newTrades);
    }
    function up(index: number) {
        if (index > 0 && trades.length > 1) {
            const newTrades = [...trades];
            const temp = newTrades[index - 1];
            newTrades[index - 1] = newTrades[index];
            newTrades[index] = temp;
            saveTrades(newTrades);
        }
    }
    function down(index: number) {
        if (index < trades.length - 1 && trades.length > 1) {
            const newTrades = [...trades];
            const temp = newTrades[index + 1];
            newTrades[index + 1] = newTrades[index];
            newTrades[index] = temp;
            saveTrades(newTrades);
        }
    }
    function active() {
        return startEquity.length > 0 && entryPrice.length > 0 && exitPrice.length > 0 && size.length > 0;
    }
    function oneActive() {
        return startEquity.length > 0 || entryPrice.length > 0 || exitPrice.length > 0 || size.length > 0 || mangoLiquidationPrice.length > 0
    }
    return (
        <div>
            <table>
                <tbody>
                    <tr>
                        <th>Start Equity</th>
                        <th>Entry Price</th>
                        <th>Exit Price</th>
                        <th>Size</th>
                        <th>Direction</th>
                        <th>Start Leverage</th>
                        <th>End Leverage</th>
                        <th>End Equity</th>
                        <th>Theoretical Liq. Price</th>
                        <th>Mango Liq. Price</th>
                        <th>Profit {'&'} Loss</th>
                        <th>Change %</th>
                    </tr>
                    {trades.map((trade, index) => {
                        const { startEquity, entryPrice, exitPrice, size, direction, mangoLiquidationPrice } = trade;
                        const startLev = (size * entryPrice) / startEquity;
                        const endEquity = direction === Direction.long ? 
                            (size * exitPrice) - (size * entryPrice) + startEquity
                            :
                            (size * entryPrice) - (size * exitPrice) + startEquity
                        ;
                        const endLev = (size * exitPrice) / endEquity;
                        const liqPrice = direction === Direction.long ?
                            ((size * entryPrice) - startEquity) / size
                            :
                            ((size * entryPrice) + startEquity) / size
                        ;
                        const profitLoss = endEquity - startEquity;
                        const change = profitLoss / startEquity;
                        function updateTrade(newTrade: Trade) {
                            const newTrades = [...trades];
                            newTrades[index] = newTrade;
                            saveTrades(newTrades);
                        }
                        return (
                            <tr key={index}>
                                <Updateable trade={trade} onChange={updateTrade} k="startEquity" />
                                <Updateable trade={trade} onChange={updateTrade} k="entryPrice" />
                                <Updateable trade={trade} onChange={updateTrade} k="exitPrice" />
                                <Updateable trade={trade} onChange={updateTrade} k="size" />
                                <th>
                                    {direction}
                                    <Spacer />
                                    <button onClick={() => {
                                        const newTrade = {...trade};
                                        newTrade.direction = trade.direction === Direction.long ? Direction.short : Direction.long;
                                        updateTrade(newTrade);
                                    }}>✎</button>
                                </th>
                                <td>{dec2(startLev)}</td>
                                <td>{dec2(endLev)}</td>
                                <td>{dec2(endEquity)}</td>
                                <td>{dec2(liqPrice)}</td>
                                <Updateable trade={trade} onChange={updateTrade} k="mangoLiquidationPrice" />
                                <td>{dec2(profitLoss)}</td>
                                <td>{Math.round(dec2(change) * 100)}%</td>
                                <td><button onClick={() => { deleteTrade(index) }}>X</button></td>
                                <td><button onClick={() => { up(index) }}><span role="img" aria-label='up'>⇧</span></button></td>
                                <td><button onClick={() => { down(index) }}><span role="img" aria-label='down'>⇩</span></button></td>
                            </tr>
                        );
                    })}
                    <tr>
                        <td><input type="text" value={startEquity} onChange={e => { setIfNumeric(e.target.value, setStartEquity); }} /></td>
                        <td><input type="text" value={entryPrice} onChange={e => { setIfNumeric(e.target.value, setEntryPrice); }} /></td>
                        <td><input type="text" value={exitPrice} onChange={e => { setIfNumeric(e.target.value, setExitPrice); }} /></td>
                        <td><input type="text" value={size} onChange={e => { setIfNumeric(e.target.value, setSize); }} /></td>
                        <td>
                            <select onChange={e => { setDirection(e.target.value as Direction) }}>
                                {Object.values(Direction).map((direction) => <option value={direction} key={direction}>
                                    {direction}
                                </option>)}
                            </select>
                        </td>
                        <td>{active() && <input type="button" value="Add" onClick={() => {addTrade()}} />}</td>
                        <td>{oneActive() && <input type="button" value="Clear" onClick={() => {clear()}} />}</td>
                        <td></td>
                        <td></td>
                        <td><input type="text" value={mangoLiquidationPrice} onChange={e => { setIfNumeric(e.target.value, setMangoLiquidationPrice); }} /></td>
                    </tr>
                </tbody>
            </table>
        </div>
    )
}

const Spacer: React.FC = () => <span style={{width: 10, display: 'inline-block'}}></span>;

const Updateable: React.FC<{trade: Trade; k: keyof Trade; onChange: (newTrade: Trade) => void}> = ({trade, k, onChange}) => {
    const [updating, setUpdating] = useState(false);
    const [curUpdateVal, setCurUpdateVal] = useState("");
    const curVal: number = trade[k] as any;
    function send() {
        if (curUpdateVal.length > 0) {
            const newTrade = {...trade};
            (newTrade as any)[k] = parseFloat(curUpdateVal);
            onChange(newTrade);
        }
    }
    return (
        <td>
            {curVal ? dec2(curVal) : "N/A"}
            <Spacer />
            {updating && <form>
                <input type="text" onChange={e => { setIfNumeric(e.target.value, setCurUpdateVal); }} style={{width: 50}} value={curUpdateVal} />
                {curUpdateVal.length > 0 && <input type="submit" onClick={() => { send(); setCurUpdateVal(""); setUpdating(false); }} value="☑" />}
                <button onClick={() => { setCurUpdateVal(""); setUpdating(false); }}>☒</button>
            </form>}
            {!updating && <button onClick={() => { setUpdating(true); }}>✎</button>}
        </td>
    )
}