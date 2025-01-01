import { Buffer } from "buffer";
export default class UR {
    private _cborPayload;
    private _type;
    constructor(_cborPayload: Buffer, _type?: string);
    static fromBuffer(buf: Buffer): UR;
    static from(value: any): UR;
    decodeCBOR(): Buffer;
    get type(): string;
    get cbor(): Buffer;
    equals(ur2: UR): boolean;
}
