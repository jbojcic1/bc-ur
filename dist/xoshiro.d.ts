import BigNumber from 'bignumber.js';
import { Buffer } from "buffer";
export default class Xoshiro {
    private s;
    constructor(seed: Buffer);
    private setS;
    private roll;
    next: () => BigNumber;
    nextDouble: () => BigNumber;
    nextInt: (low: number, high: number) => number;
    nextByte: () => number;
    nextData: (count: number) => number[];
}
