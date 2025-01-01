import { Big } from 'big.js';
import { Buffer } from "buffer";
export default class Xoshiro {
    private s;
    constructor(seed: Buffer);
    private setS;
    private roll;
    next: () => Big;
    nextDouble: () => Big;
    nextInt: (low: number, high: number) => number;
    nextByte: () => number;
    nextData: (count: number) => number[];
}
