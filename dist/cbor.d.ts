import { Buffer } from "buffer";
export declare const cborEncode: (data: any) => Buffer;
export declare const cborDecode: (data: string | Buffer) => any;
