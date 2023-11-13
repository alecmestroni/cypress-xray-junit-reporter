export function startingPlugin(): void;
export function endPlugin(): void;
export function warning(suitesNum: any, message: any): void;
export function skippedTestcase(suitesNum: any, title: any): void;
export function analyzedTestcase(suitesNum: any, title: any): void;
export function error(suitesNum: any): void;
export function foundingSuite(suitesNum: any, suitesQuantity: any): void;
export function analyzingSuite(suitesNum: any, title: any): void;
export function endSuite(suitesNum: any, title: any): void;
