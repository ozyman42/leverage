export function upload(): Promise<string> {
    const input = document.createElement("input");
    input.type = 'file';
    return new Promise(resolve => {
        input.onchange = () => {
            const reader = new FileReader();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            reader.readAsText(input.files![0]);
            reader.onload = (e) => {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                resolve(e.target!.result as string);
                input.remove();
            }
        }
        input.click();
    });
}