import UR from './ur';
export default class UREncoder {
    private ur;
    private fountainEncoder;
    constructor(_ur: UR, maxFragmentLength?: number, firstSeqNum?: number, minFragmentLength?: number);
    get fragmentsLength(): number;
    get fragments(): import("buffer").Buffer[];
    get messageLength(): number;
    get cbor(): import("buffer").Buffer;
    encodeWhole(): string[];
    nextPart(): string;
    private static encodeUri;
    private static encodeUR;
    private static encodePart;
    static encodeSinglePart(ur: UR): string;
}
