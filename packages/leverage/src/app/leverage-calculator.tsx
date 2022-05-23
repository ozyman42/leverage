import React, { useState, useEffect } from 'react';
import TimezoneSelect, { ITimezoneOption } from 'react-timezone-select';
import { ByBit } from './bybit';
import { CostToRemake } from './remake-cost';
import {Trade, Direction, AppState, getState, TradeInputs, UpdateableFields, saveState, clearState} from './state';

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
    return (!isNaN(num) && !isNaN(value as unknown as number));
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
    const maxLoss = stopLoss / startEquity;
    const percentMoveToIdeal = (idealExit - entry) / entry;
    const percentMoveToStop = (stop - entry) / entry;
    const riskToReward = Math.abs(change / maxLoss);
    
    // Mango start
    //   TODO: maintenance leverage is 40x for SOL, BTC, and ETH perps but smaller for other perps and operates by a different mechanism for spot (seemingly).
    //         fix this by adding a trading platform input and an asset market.
    const liquidationLeverage = 40;
    const equityDirection = direction === Direction.long ? -1 : 1;
    const mangoLiqPrice = ((equityDirection * liquidationLeverage * entry * size) + (liquidationLeverage * startEquity)) / (size + (liquidationLeverage * size * equityDirection));
    // Mango end
    
    return {entry, stop, startEquity, size, idealExit, direction, endEquity, equityAtStop, startLev, endLev, stopLev, liqPrice, change, stopLoss, maxLoss, mangoLiqPrice, profitLoss, percentMoveToStop, percentMoveToIdeal, riskToReward,
        started: trade.started, ended: trade.finished
    };
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

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

const tzNameToOption = (name: string): ITimezoneOption => {
    return {
        value: name,
        label: ""
    };
}

function addToWindow<A extends string, B>(obj: Record<A, B>) {
    Object.entries(obj).forEach(([a, b]) => { (window as unknown as Record<string, unknown>)[a] = b })
}

const initFields: TradeInputs = Object.fromEntries(Object.values(UpdateableFields).map(f => [f, ""])) as TradeInputs
const initState = getState();



export const LeverageCalculator: React.FC = () => {
    const [trades, setTrades] = useState<AppState>(initState);
    const [inputs, setInputs] = useState<TradeInputs>(initFields);
    const [editing, setEditing] = useState<number>(-1);
    const [editingActive, setEditingActive] = useState(false);
    const [statsForPastTradesWindow, setStatsForPastTradesWindow] = useState(-1);
    const [name, setName] = useState(initState.name);
    const [timezone, setTimeZone] = useState<ITimezoneOption>(tzNameToOption(initState.timezone));
    const [newPortfolioName, setNewPortfolioName] = useState("");
    const [changingPortfolioName, setChangingPortfolioName] = useState(false);
    const [creatingNewPortfolio, setCreatingNewPortfolio] = useState(false);

    useEffect(() => {
        window.document.title = `Leverage | ${trades.name}`;
        setName(trades.name);
        return noop;
    }, [trades.name]);
    useEffect(() => {
        setTimeZone(tzNameToOption(trades.timezone));
        return noop;
    }, [trades.timezone]);
    function clear() {
        setInputs(initFields);
    }
    function reset() {
        clearState();
        setTrades(getState());
    }
    addToWindow({reset});
    function upload() {
        const input = document.createElement("input");
        input.type = 'file';
        input.onchange = () => {
            const reader = new FileReader();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            reader.readAsText(input.files![0]);
            reader.onload = (e) => {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                saveTrades(JSON.parse(e.target!.result as string));
                input.remove();
            }
        }
        input.click();
    }
    addToWindow({upload});
    function download() {
        const current = getState();
        const link = document.createElement("a");
        const now = new Date();
        const dateDisplay = now.toLocaleString('en-us', {timeZone: trades.timezone, timeZoneName: 'short'}).split(", ").join("_").split(":").join("-").split(" ").join("_").split("/").join("-");
        link.download = `leverage-${trades.name}-${dateDisplay}.json`;
        const blob = new Blob([JSON.stringify(current, null, 4)], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.click();
        link.remove();
    }
    addToWindow({download});
    function saveTrades(newState: AppState) {
        setTrades(newState);
        saveState(newState);
    }
    function inputsToTrade(): Trade {
        return {...Object.fromEntries(Object.entries(inputs).map(([field, value]) => [field, parseFloat(value)])) as {[f in UpdateableFields]: number}, locked: false};
    }
    function setSelected(toSelect: string) {
        saveTrades({...trades, selectedPortfolio: toSelect});
    }
    function renamePortfolio(newName: string) {
        const newActive = {...trades.active};
        const activeTrades = [...trades.active[trades.selectedPortfolio]];
        delete newActive[trades.selectedPortfolio];
        newActive[newName] = activeTrades;
        saveTrades({...trades, active: newActive, selectedPortfolio: newName});
    }
    function createNewPortfolio(name: string) {
        const newActive = {...trades.active};
        newActive[name] = [];
        saveTrades({...trades, active: newActive, selectedPortfolio: name});
    }
    function lockTrade(index: number) {
        const newActiveTrades = [...trades.active[trades.selectedPortfolio]];
        const [removed] = newActiveTrades.splice(index, 1);
        const lockedTrade = {...removed, locked: true};
        newActiveTrades.splice(index, 0, lockedTrade);
        const newActive = {...trades.active, [trades.selectedPortfolio]: newActiveTrades};
        saveTrades({...trades, active: newActive});
    }
    function addTrade() {
        if (!active()) return;
        const newStagingTrades = [...trades.stagingGround];
        newStagingTrades.push(inputsToTrade());
        saveTrades({...trades, stagingGround: newStagingTrades});
        clear();
    }
    function startTrade(index: number) {
        if (index >= trades.stagingGround.length || index < 0) return;
        const newStagingTrades = [...trades.stagingGround];
        const [removed] = newStagingTrades.splice(index, 1);
        const newActiveTrade = {...removed};
        newActiveTrade.started = Date.now();
        const newActiveTrades = [...trades.active[trades.selectedPortfolio]];
        newActiveTrades.splice(0, 0, newActiveTrade);
        const newActive = {...trades.active, [trades.selectedPortfolio]: newActiveTrades};
        saveTrades({...trades, active: newActive, stagingGround: newStagingTrades});
    }
    function endTrade(index: number, stopped: boolean) {
        if (index >= trades.active[trades.selectedPortfolio].length || index < 0) return;
        const newActiveTrades = [...trades.active[trades.selectedPortfolio]];
        const newTrade = {...newActiveTrades[index]};
        newTrade.finished = {
            at: Date.now(),
            stopped
        };
        newActiveTrades[index] = newTrade;
        const newActive = {...trades.active, [trades.selectedPortfolio]: newActiveTrades};
        saveTrades({...trades, active: newActive});
    }
    function backToStaging(index: number) {
        if (index >= trades.active[trades.selectedPortfolio].length || index < 0) return;
        const newActiveTrades = [...trades.active[trades.selectedPortfolio]];
        const [removed] = newActiveTrades.splice(index, 1);
        const newTrade = {...removed};
        delete newTrade.started;
        const newActive = {...trades.active, [trades.selectedPortfolio]: newActiveTrades};
        const newStaging = [...trades.stagingGround];
        newStaging.push(newTrade);
        saveTrades({...trades, active: newActive, stagingGround: newStaging});
    }
    function deleteTrade(index: number) {
        const newStagingTrades = [...trades.stagingGround];
        newStagingTrades.splice(index, 1);
        saveTrades({...trades, stagingGround: newStagingTrades});
        if (editing === index) {
            setEditing(-1);
        }
    }
    function duplicateTrade(index: number) {
        const newStagingTrades = [...trades.stagingGround];
        const newTrade = {...newStagingTrades[index]};
        newStagingTrades.splice(index, 0, newTrade);
        saveTrades({...trades, stagingGround: newStagingTrades});
        if (editing > index) {
            setEditing(editing + 1);
        }
    }
    function up(index: number) {
        const stagingTrades = trades.stagingGround;
        if (index > 0 && stagingTrades.length > 1) {
            const newTrades = [...stagingTrades];
            const temp = newTrades[index - 1];
            newTrades[index - 1] = newTrades[index];
            newTrades[index] = temp;
            setEditing(editing - 1);
            saveTrades({...trades, stagingGround: newTrades});
        }
    }
    function down(index: number) {
        const stagingTrades = trades.stagingGround;
        if (index < stagingTrades.length - 1 && stagingTrades.length > 1) {
            const newTrades = [...stagingTrades];
            const temp = newTrades[index + 1];
            newTrades[index + 1] = newTrades[index];
            newTrades[index] = temp;
            setEditing(editing + 1);
            saveTrades({...trades, stagingGround: newTrades});
        }
    }
    function active() {
        return Object.values(inputs).filter(val => val.length === 0).length === 0;
    }
    function oneActive() {
        return Object.values(inputs).filter(val => val.length > 0).length > 0;
    }
    function updateTrade(newTrade: Trade, index: number, active: boolean) {
        if (active) {
            const newTrades = [...trades.active[trades.selectedPortfolio]];
            newTrades[index] = newTrade;
            const newActive = {...trades.active, [trades.selectedPortfolio]: newTrades}
            saveTrades({...trades, active: newActive});
        } else {
            const newTrades = [...trades.stagingGround];
            newTrades[index] = newTrade;
            saveTrades({...trades, stagingGround: newTrades});
        }
    }
    function getOverallStats() {
        const active = trades.active;
        let wins = 0;
        let losses = 0;
        let totalPercentChange = 0;
        let totalObserved = 0;
        const windowSize = 
            statsForPastTradesWindow === -1 ? active[trades.selectedPortfolio].length :
            statsForPastTradesWindow;
        let netChangeByTrade = 1;
        let setEnd = false;
        let end = 0;
        let start = 0;
        let i = 0;
        for (; i < windowSize && i < active[trades.selectedPortfolio].length; ++i) {
            const trade = active[trades.selectedPortfolio][i];
            if (!trade.finished) continue;
            const stats = getStats(trade);
            if (!setEnd) {
                end = trade.finished.stopped ? stats.equityAtStop : stats.endEquity;
                setEnd = true;
            }
            totalObserved++;
            if (trade.finished.stopped) {
                losses++;
                totalPercentChange += stats.maxLoss;
                netChangeByTrade *= 1 + stats.maxLoss;
            } else {
                wins++;
                totalPercentChange += stats.change;
                netChangeByTrade *= 1 + stats.change;
            }
            start = stats.startEquity;
        }
        netChangeByTrade -= 1;
        const netChangeByEquity = ((end - start) / start);
        return { wins, losses, totalPercentChange, totalObserved, netChangeByTrade, netChangeByEquity, start, end };
    }
    const overallStats = getOverallStats();
    const realTradesSummaryCSS: React.CSSProperties = overallStats.totalPercentChange !== 0 ? {backgroundColor: overallStats.netChangeByEquity < 0 ? 'lightsalmon' : 'lightgreen'} : {};
    return (
        <div>
            <ByBit />
            <table>
                <tbody>
                    <tr>
                        <th>
                            Update Name:
                        </th>
                        <td>
                            <input type="text" value={name} onChange={e => { setName(e.target.value); }} />
                        </td>
                        <td>
                            {name.length > 0 && trades.name !== name && 
                                <input type="button" value="Rename" onClick={() => { saveTrades({...trades, name}); }} />
                            }
                        </td>
                        <td colSpan={5}>
                            <TimezoneSelect value={timezone} onChange={setTimeZone} />
                        </td>
                        <td>
                            {timezone.value !== trades.timezone &&
                                <input type="button" value="Update TZ" onClick={() => { saveTrades({...trades, timezone: timezone.value}); }} />
                            }
                        </td>
                        {/*<td colSpan={2}>
                            Reversal Price:<br />
                            <input type="number" value={theoreticalReversal} onChange={e => { setIfNumeric(e.target.value, setTheoresticalReversal); }} />
                        </td>
                        <td colSpan={2}>
                            Equity When Laddering:<br />
                            <input type="number" value={ladderEquity} onChange={e => { setIfNumeric(e.target.value, setLadderEquity); }} />
                        </td>
                        <td>
                            Reversal Type: <br />
                            <select value={"" + calculatingForTop} onChange={e => { setCalculatingForTop(e.target.value === 'top') }}>
                                <option value='top'>
                                    Top
                                </option>
                                <option value='bottom'>
                                    Bottom
                                </option>
                            </select>
                        </td>*/}
                        <td colSpan={11}>
                            <CostToRemake remake={trades.remakeParams} set={remakeParams => { saveTrades({...trades, remakeParams}); }} />
                            {/*theoreticalReversal.length > 0 && <Ladders isBottom={!calculatingForTop} price={parseFloat(theoreticalReversal)} equity={parseFloat(ladderEquity)} />*/} 
                        </td>
                    </tr>
                    <tr>
                        <th colSpan={20}>
                            Staging Ground
                        </th>
                    </tr>
                    <tr>
                        <td>
                            <input type="button" value="Clear Trades" onClick={() => { reset(); }} />
                            <br />
                            <input type="button" value="Download" onClick={() => { download(); }} />
                            <br />
                            <input type="button" value="Upload" onClick={() => { upload(); }} />
                        </td>
                        <ColumnHeaders displayTimes={false} />
                    </tr>
                    {trades.stagingGround.map((trade, index) => {
                        const beingEdited = index === editing && !editingActive;
                        const stats = getStats(trade);
                        return (
                            <tr key={index} style={beingEdited ? {backgroundColor: 'lightblue'} : {}}>
                                <td>
                                    {beingEdited ?
                                        <input type="button" value="☑" onClick={() => { setEditing(-1); }}/>
                                        :
                                        <input type="button" value="✎" onClick={() => { setEditing(index); setEditingActive(false); }} />
                                    }
                                </td>
                                {Object.values(UpdateableFields).map(field =>
                                    <Updateable trade={trade} onChange={trade => { updateTrade(trade, index, false); }} k={field} key={field} editing={beingEdited} />
                                )}
                                <th>{stats.direction}</th>
                                <StatsDisplay stats={stats} tz={trades.timezone} />
                                <td style={{width: 120}}>
                                    <button onClick={() => { deleteTrade(index) }}>X</button>
                                    <Spacer />
                                    <button onClick={() => { startTrade(index) }}>Start</button>
                                    <Spacer />
                                    <button onClick={() => { duplicateTrade(index) }}>❐</button>
                                    {beingEdited && <>
                                        <br />
                                        <button onClick={() => { up(index) }}><span role="img" aria-label='up'>⇧</span></button>
                                        <Spacer />
                                        <button onClick={() => { down(index) }}><span role="img" aria-label='down'>⇩</span></button>
                                    </>}
                                </td>
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
                        {active() && <StatsDisplay stats={getStats(inputsToTrade())} tz={trades.timezone} />}
                    </tr>
                    <tr>
                        <th colSpan={22}>
                            Real Trades<br />
                            Portfolio<Spacer />
                            <select value={trades.selectedPortfolio} onChange={e => { setSelected(e.target.value); setChangingPortfolioName(false); }}>
                                {Object.keys(trades.active).map(portfolio => <option key={portfolio} value={portfolio}>{portfolio}</option>)}
                            </select>
                            <Spacer />
                            {(changingPortfolioName || creatingNewPortfolio) && <form>
                                <input type="text" value={newPortfolioName} onChange={e => { setNewPortfolioName(e.target.value); }} />
                                <input type="submit" value={creatingNewPortfolio ? "Create New" : "Rename"} onClick={() => {
                                    if (creatingNewPortfolio) {
                                        createNewPortfolio(newPortfolioName); setCreatingNewPortfolio(false);
                                    } else {
                                        renamePortfolio(newPortfolioName); setChangingPortfolioName(false);
                                    }
                                }} />
                                <input type="button" value="Cancel" onClick={() => { setChangingPortfolioName(false); setCreatingNewPortfolio(false); }} />
                            </form>}
                            {!changingPortfolioName && !creatingNewPortfolio && <>
                                <input type="button" value={`Rename ${trades.selectedPortfolio}`} onClick={() => { setNewPortfolioName(trades.selectedPortfolio); setChangingPortfolioName(true); }} />
                                <input type="button" value="New Portfolio" onClick={() => { setNewPortfolioName(""); setCreatingNewPortfolio(true); }} />
                            </>}
                        </th>
                    </tr>
                    <tr>
                        <td>
                            Stats for latest: <br />
                            <select value={statsForPastTradesWindow} onChange={e => {setStatsForPastTradesWindow(parseInt(e.target.value))}}>
                                <option value={-1}>All</option>
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </td>
                        {overallStats.totalObserved > 0 && <>
                                <td style={realTradesSummaryCSS}>
                                    Summary of past <b>{overallStats.totalObserved}</b> trades
                                </td>
                                <td style={realTradesSummaryCSS}>
                                    <b>{overallStats.wins}</b> wins<br />({dec2(overallStats.wins / overallStats.totalObserved * 100)}%)
                                </td>
                                <td style={realTradesSummaryCSS}>
                                    <b>{overallStats.losses}</b> losses<br />({dec2(overallStats.losses / overallStats.totalObserved * 100)}%)
                                </td>
                                <td style={realTradesSummaryCSS}>
                                    <b>{dec2(overallStats.totalPercentChange / overallStats.totalObserved * 100)}%</b><br />average change
                                </td>
                                <td style={realTradesSummaryCSS} colSpan={2}>
                                    started with<br /><b>${dec2(overallStats.start)}</b>
                                </td>
                                <td style={realTradesSummaryCSS} colSpan={2}>
                                    ended with<br /><b>${dec2(overallStats.end)}</b>
                                </td>
                                <td style={realTradesSummaryCSS}>
                                    <b>{dec2(overallStats.netChangeByTrade * 100)}%</b><br />net change by trades
                                </td>
                                <td style={realTradesSummaryCSS}>
                                    <b>{dec2(overallStats.netChangeByEquity * 100)}%</b><br />net change by equity
                                </td>
                                <td style={realTradesSummaryCSS} colSpan={11}></td>
                            </>}
                        {overallStats.totalObserved === 0 && <td colSpan={21}>Stats will show here once real trades are executed and closed</td>}
                    </tr>
                    <tr>
                        <td></td>
                        <ColumnHeaders displayTimes={true} />
                    </tr>
                    {trades.active[trades.selectedPortfolio].map((trade, index) => {
                        const beingEdited = index === editing && editingActive;
                        const stats = getStats(trade);
                        return (
                            <tr key={index} style={beingEdited ? {backgroundColor: 'lightblue'} : stats.ended !== undefined ? {backgroundColor: stats.ended.stopped ? 'lightsalmon' : 'lightgreen'}: {}}>
                                <td>
                                    {!trade.locked &&
                                        <>
                                            {beingEdited ?
                                                <input type="button" value="☑" onClick={() => { setEditing(-1); }}/>
                                                :
                                                <input type="button" value="✎" onClick={() => { setEditing(index); setEditingActive(true); }} />
                                            }
                                            <Spacer />
                                            {trade.finished && <input type="button" value="🔒" onClick={() => { lockTrade(index); }} />}
                                        </>
                                    }
                                    {trade.locked && <>Locked</>}
                                </td>
                                {Object.values(UpdateableFields).map(field =>
                                    <Updateable trade={trade} onChange={trade => { updateTrade(trade, index, true); }} k={field} key={field} editing={beingEdited} />
                                )}
                                <th>{stats.direction}</th>
                                <StatsDisplay stats={stats} tz={trades.timezone} />
                                {stats.ended === undefined && <>
                                    <td>
                                        <button onClick={() => { endTrade(index, false) }}>End @ Ideal</button><br />
                                        <button onClick={() => { endTrade(index, true) }}>End @ Stop</button>
                                    </td>
                                    <td><button onClick={() => { backToStaging(index) }}>Send back to Staging</button></td>
                                </>}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    )
}

type Entry = {
    percentOffBasisPoints: number;
    weightBasisPoints: number;
}

const LADDER_ENTRIES: Entry[] = [
    {
        percentOffBasisPoints: -50,
        weightBasisPoints: 50
    },
    {
        percentOffBasisPoints: 50,
        weightBasisPoints: 50
    }
]

/*
const Ladders: React.FC<{isBottom: boolean; price: number; equity: number;}> = ({isBottom, price, equity}) => {
    let accumulatedWeight = 0;

    const firstEntry = isBottom ? 1.005 * price : .995 * price;
    const secondEntry = isBottom ? .996 * price : 1.004 * price;
    const reversalNoun = isBottom ? "bottom" : "top";
    const maxLossBasisPoints = 900;
    const maxMoveFromFromPriceBasisPoints = 300;
    const direction = isBottom ? "long" : "short";
    const equityAtStop = equity * (1 - (maxLossBasisPoints / 100));
    
    
    return (
        <>
            Enter {} {direction} at {firstEntry} (0.5% before {reversalNoun})and {} {direction} at {secondEntry} (0.4% after {reversalNoun}) with a stop at {} ({}% after {reversalNoun}) to at most lose {maxLoss * 100}%
        </>
    )
}
*/

const ColumnHeaders: React.FC<{displayTimes: boolean}>  = ({displayTimes}) => <>
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
    <th>% Move to Ideal</th>
    <th>% Move to Stop</th>
    <th>Risk to Reward Ratio</th>
    <th>Theoretical Liq Price</th>
    <th>Mango Perp Liq Price</th>
    <th>Mango Spot Liq Price</th>
    {displayTimes && <>
        <th>Opened At</th>
        <th>Closed At</th>
    </>}
</>;

function dateDisplay(d: Date, tz: string): string {
    return d.toLocaleString('en-US', { timeZone: tz, timeZoneName: 'short' })
}

const StatsDisplay: React.FC<{stats: ReturnType<typeof getStats>, tz: string}> = ({stats, tz}) => <>
    <td>{dec2(stats.startLev)}</td>
    <td>{dec2(stats.endLev)}</td>
    <td>{dec2(stats.stopLev)}</td>
    <td>{dec2(stats.endEquity)}</td>
    <td>{dec2(stats.equityAtStop)}</td>
    <td>{dec2(stats.profitLoss)}<br />({dec2(stats.change * 100)}%)</td>
    <td>{dec2(stats.stopLoss)}<br />({dec2(stats.maxLoss * 100)}%)</td>
    <td>{dec2(stats.percentMoveToIdeal * 100)}%</td>
    <td>{dec2(stats.percentMoveToStop * 100)}%</td>
    <td>{dec2(stats.riskToReward)}:1</td>
    <td>{dec2(stats.liqPrice)}</td>
    <td>{dec2(stats.mangoLiqPrice)}</td>
    <td>Coming soon...</td>
    {stats.started && <>
        <td style={{width: 120}}>{dateDisplay(new Date(stats.started), tz)}</td>
        <td style={{width: 120}}>{stats.ended ? dateDisplay(new Date(stats.ended.at), tz) : "N/A"}</td>
    </>}
</>

const FormField: React.FC<{value: string; onChange: (s: string) => void}> = ({onChange, value}) => {
    return (
        <td>
            <input type="number" value={value} style={{width: INPUT_WIDTH}} onChange={e => { setIfNumeric(e.target.value, v => { onChange(v); }); }} />
        </td>
    )
}

const Spacer: React.FC = () => <span style={{display: 'inline-block', width: 2}}></span>

const INPUT_WIDTH = 78;
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
            newTrade[k] = parseFloat(v);
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