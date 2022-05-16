import * as React from 'react';

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

export const CostToRemake: React.FC = () => {
    const [lose, setLose] = React.useState("10");
    const [gain, setGain] = React.useState("40");
    const loseAsNum = parseInt(lose);
    const capitalAfterLoss = (100 - loseAsNum) / 100;
    const remakeNeeded = hundredths(((1 / capitalAfterLoss) * 100) - 100);
    const gainAsNum = parseInt(gain);
    const capitalAfterGain = (100 + gainAsNum) / 100;
    const winRatio = Math.log(1 / capitalAfterGain) / Math.log(capitalAfterLoss);
    const winRate = hundredths(100 * 1 / winRatio);
    return <>
        If you lose &nbsp;
        <input type="number" min={1} max={99} step={1} width={50} value={lose} onChange={e => { setIfNumeric(e.target.value, setLose) }} />%
        then you need a {remakeNeeded}% gain to return to break-even<br />
        Assuming an average profit of <input type="number" style={{width: 50}} min={1} step={1} value={gain} onChange={e => { setIfNumeric(e.target.value, setGain); }} />% you would need to win {winRate}% of the time
        <br />({hundredths(winRatio)}:1 losses per win ratio) to break even.
    </>
}