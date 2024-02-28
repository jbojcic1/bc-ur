import { Buffer } from "buffer";
import {encode, decode} from "cborg/cborg.js";

export const cborEncode = (data: any): Buffer => {
  return Buffer.from(encode(data));
}

export const cborDecode = (data: string | Buffer): any => {
  return decode(Buffer.isBuffer(data) ? data : Buffer.from(data as string, 'hex'));
}