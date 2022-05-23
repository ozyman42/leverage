import * as React from 'react';
import { RemakeParams } from './state';
import commaNumber from 'comma-number';
 
function setIfNumeric(value: string, setter: (input: string) => void) {
    if (value === "" || isNumeric(value)) {
        setter(value);
    }
}

function isNumeric(value: string) {
    const num = parseFloat(value);
    return (!isNaN(num) && !isNaN(value as unknown as number));
}

function hundredths(num: number) {
    return Math.round(num * 100) / 100;
}

function tenths(num: number) {
    return Math.round(num * 10) / 10;
}

type CostToRemakeProps = {
    remake: RemakeParams;
    set: (newRemake: RemakeParams) => void;
}

const Number: React.FC<{min: number; step: number; val: number; max?: number; width?: number; change: (n: number) => void}> = 
    props => <input type="number" min={props.min} step={props.step} value={props.val} max={props.max} style={{width: props.width ?? 42}}
    onChange={e => { setIfNumeric(e.target.value, n => { props.change(parseFloat(n)); }); }} />

export const CostToRemake: React.FC<CostToRemakeProps> =
({remake, set}) => {
    const [successfulTrades, setSuccessfulTrades] = React.useState(30);
    const { avgLoss, avgGainPerLossFactor, stopLoss, goal, start, winRate } = remake;
    const capitalAfterLoss = (100 - avgLoss) / 100;
    const remakeNeeded = hundredths(((1 / capitalAfterLoss) * 100) - 100);
    const avgGain = avgLoss * avgGainPerLossFactor;
    const capitalAfterGain = (100 + avgGain) / 100;
    const lossesPerWinRatio = Math.log(1 / capitalAfterGain) / Math.log(capitalAfterLoss);
    const breakEvenWinRate = hundredths(100 * 1 / (lossesPerWinRatio + 1));
    const leverage = avgLoss / stopLoss;
    const takeProfit = stopLoss * avgGainPerLossFactor;
    const normalizedWinRate = winRate / 100;
    const totalTradesToReachGoal = Math.round(Math.log(goal / start) / Math.log(Math.pow(capitalAfterGain, normalizedWinRate) * Math.pow(capitalAfterLoss, 1 - normalizedWinRate)));
    const goalLosses = Math.floor(totalTradesToReachGoal * (1 - normalizedWinRate));
    const goalWins = Math.ceil(totalTradesToReachGoal * normalizedWinRate);
    const mathCheck = hundredths(start * Math.pow(capitalAfterGain, goalWins) * Math.pow(capitalAfterLoss, goalLosses));
    const afterSuccess = start * Math.pow(capitalAfterGain, successfulTrades);
    const consecutiveSuccessMultiplier = commaNumber(tenths(afterSuccess/start));
    const afterSuccessDisplay = commaNumber(hundredths(afterSuccess));
    return <>
        If you risk a loss of &nbsp;
        <Number min={1} max={99} step={.5} val={avgLoss} change={avgLoss => { set({...remake, avgLoss}); } } />%
        then you need a {remakeNeeded}% gain to return to break-even<br />
        Assuming an average profit to loss factor of &nbsp;
        <Number min={0.1} step={.1} val={avgGainPerLossFactor} change={f => { set({...remake, avgGainPerLossFactor: tenths(f) }); }} />:<br />
        <ul style={{padding: '2px 0 2px 15px', margin: 0}}>
            <li>Average profit would be {hundredths(avgGain)}%</li>
            <li>You would need to win {breakEvenWinRate}% of the time to break even</li>
            <li>This is a 1:{hundredths(lossesPerWinRatio)} win to loss ratio</li>
        </ul>
        Assuming a stop loss of a <Number val={stopLoss} min={0} step={0.1} change={stopLoss => { set({...remake, stopLoss}); }} />%
        price move against you,<br/>
        this implies a leverage of {hundredths(leverage)}x and take profit of a {hundredths(takeProfit)}% price change in your favor.<br />
        Assuming a goal of $<Number val={goal} min={0} step={10000} width={90} change={goal => { set({...remake, goal}); }} />&nbsp;
        and starting capital of $<Number val={start} min={1} step={100} width={90} change={start => { set({...remake, start}); }} />&nbsp;
        w/ a win rate of <Number val={winRate} min={1} step={.5} max={99} change={winRate => { set({...remake, winRate}); }} />%,<br />
        {winRate > breakEvenWinRate && <>it would take {totalTradesToReachGoal} trades to reach the goal ({goalWins} wins and {goalLosses} losses) to reach ${commaNumber(hundredths(mathCheck))}.</>}
        {winRate < breakEvenWinRate && <>you would never reach your goal since your win rate is {winRate}% while the break even win rate is {breakEvenWinRate}%.</>}<br />
        After <Number val={successfulTrades} step={1} min={1} change={setSuccessfulTrades} /> consecutive wins, you would have multiplied ${start} by {consecutiveSuccessMultiplier}x<br />
        into ${afterSuccessDisplay}.
    </>
}