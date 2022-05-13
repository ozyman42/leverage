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

export const CostToRemake: React.FC = () => {
    const [lose, setLose] = React.useState("10");
    const loseAsNum = parseInt(lose);
    const capitalAfter = (100 - loseAsNum) / 100;
    const remakeNeeded = Math.round((((1 / capitalAfter) * 100) - 100) * 100) / 100;
    return <>
        If you lose &nbsp;
        <input type="number" min={1} max={99} step={1} width={50} value={lose} onChange={e => { setIfNumeric(e.target.value, setLose) }} />%
        then you need a {remakeNeeded}% gain to return to break-even<br />
        This requires a risk to reward ratio of 
    </>
}