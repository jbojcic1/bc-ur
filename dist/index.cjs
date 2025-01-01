'use strict';

var buffer = require('buffer');
var sha256 = require('@noble/hashes/sha256');
var cborg = require('cborg');
var BigNumber = require('bignumber.js');
var JSBI = require('jsbi');
var randomSampler = require('@apocentre/alias-sampling');

class InvalidSchemeError extends Error {
    constructor() {
        super('Invalid Scheme');
        this.name = 'InvalidSchemeError';
    }
}
class InvalidPathLengthError extends Error {
    constructor() {
        super('Invalid Path');
        this.name = 'InvalidPathLengthError';
    }
}
class InvalidTypeError extends Error {
    constructor() {
        super('Invalid Type');
        this.name = 'InvalidTypeError';
    }
}
class InvalidSequenceComponentError extends Error {
    constructor() {
        super('Invalid Sequence Component');
        this.name = 'InvalidSequenceComponentError';
    }
}
class InvalidChecksumError extends Error {
    constructor() {
        super('Invalid Checksum');
        this.name = 'InvalidChecksumError';
    }
}

const CRC_TABLE = function () {
    let c;
    let crcTable = [];
    for (let n = 0; n < 256; n++) {
        c = n;
        for (let k = 0; k < 8; k++) {
            c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        crcTable[n] = c;
    }
    return crcTable;
}();
let crc32 = function (message) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < message.length; i++) {
        crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ message[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
};
const sha256Hash = (data) => buffer.Buffer.from(sha256.sha256(data));
const partition = (s, n) => s.match(new RegExp('.{1,' + n + '}', 'g')) || [s];
const split = (s, length) => [s.slice(0, -length), s.slice(-length)];
const getCRC = (message) => crc32(message);
const getCRCHex = (message) => crc32(message).toString(16).padStart(8, '0');
const toUint32 = (number) => number >>> 0;
const intToBytes = (num) => {
    const arr = new ArrayBuffer(4); // an Int32 takes 4 bytes
    const view = new DataView(arr);
    view.setUint32(0, num, false); // byteOffset = 0; litteEndian = false
    return buffer.Buffer.from(arr);
};
const isURType = (type) => {
    return type.split('').every((_, index) => {
        let c = type.charCodeAt(index);
        if ('a'.charCodeAt(0) <= c && c <= 'z'.charCodeAt(0))
            return true;
        if ('0'.charCodeAt(0) <= c && c <= '9'.charCodeAt(0))
            return true;
        if (c === '-'.charCodeAt(0))
            return true;
        return false;
    });
};
const arraysEqual = (ar1, ar2) => {
    if (ar1.length !== ar2.length) {
        return false;
    }
    return ar1.every(el => ar2.includes(el));
};
/**
 * Checks if ar1 contains all elements of ar2
 * @param ar1 the outer array
 * @param ar2 the array to be contained in ar1
 */
const arrayContains = (ar1, ar2) => {
    return ar2.every(v => ar1.includes(v));
};
/**
 * Returns the difference array of  `ar1` - `ar2`
 */
const setDifference = (ar1, ar2) => {
    return ar1.filter(x => ar2.indexOf(x) < 0);
};
const bufferXOR = (a, b) => {
    const length = Math.max(a.length, b.length);
    const buffer$1 = buffer.Buffer.allocUnsafe(length);
    for (let i = 0; i < length; ++i) {
        buffer$1[i] = a[i] ^ b[i];
    }
    return buffer$1;
};

const cborEncode = (data) => {
    return buffer.Buffer.from(cborg.encode(data));
};
const cborDecode = (data) => {
    return cborg.decode(buffer.Buffer.isBuffer(data) ? data : buffer.Buffer.from(data, 'hex'));
};

class UR {
    _cborPayload;
    _type;
    constructor(_cborPayload, _type = 'bytes') {
        this._cborPayload = _cborPayload;
        this._type = _type;
        if (!isURType(this._type)) {
            throw new InvalidTypeError();
        }
    }
    static fromBuffer(buf) {
        return new UR(cborEncode(buf));
    }
    static from(value) {
        return UR.fromBuffer(buffer.Buffer.from(value));
    }
    decodeCBOR() {
        return cborDecode(this._cborPayload);
    }
    get type() { return this._type; }
    get cbor() { return this._cborPayload; }
    equals(ur2) {
        return this.type === ur2.type && this.cbor.equals(ur2.cbor);
    }
}

const MAX_UINT64 = 0xFFFFFFFFFFFFFFFF;
const rotl = (x, k) => JSBI.bitwiseXor(JSBI.asUintN(64, JSBI.leftShift(x, JSBI.BigInt(k))), JSBI.BigInt(JSBI.asUintN(64, JSBI.signedRightShift(x, (JSBI.subtract(JSBI.BigInt(64), JSBI.BigInt(k)))))));
class Xoshiro {
    s;
    constructor(seed) {
        const digest = sha256Hash(seed);
        this.s = [JSBI.BigInt(0), JSBI.BigInt(0), JSBI.BigInt(0), JSBI.BigInt(0)];
        this.setS(digest);
    }
    setS(digest) {
        for (let i = 0; i < 4; i++) {
            let o = i * 8;
            let v = JSBI.BigInt(0);
            for (let n = 0; n < 8; n++) {
                v = JSBI.asUintN(64, JSBI.leftShift(v, JSBI.BigInt(8)));
                v = JSBI.asUintN(64, JSBI.bitwiseOr(v, JSBI.BigInt(digest[o + n])));
            }
            this.s[i] = JSBI.asUintN(64, v);
        }
    }
    roll() {
        const result = JSBI.asUintN(64, JSBI.multiply(rotl(JSBI.asUintN(64, JSBI.multiply(this.s[1], JSBI.BigInt(5))), 7), JSBI.BigInt(9)));
        const t = JSBI.asUintN(64, JSBI.leftShift(this.s[1], JSBI.BigInt(17)));
        this.s[2] = JSBI.asUintN(64, JSBI.bitwiseXor(this.s[2], JSBI.BigInt(this.s[0])));
        this.s[3] = JSBI.asUintN(64, JSBI.bitwiseXor(this.s[3], JSBI.BigInt(this.s[1])));
        this.s[1] = JSBI.asUintN(64, JSBI.bitwiseXor(this.s[1], JSBI.BigInt(this.s[2])));
        this.s[0] = JSBI.asUintN(64, JSBI.bitwiseXor(this.s[0], JSBI.BigInt(this.s[3])));
        this.s[2] = JSBI.asUintN(64, JSBI.bitwiseXor(this.s[2], JSBI.BigInt(t)));
        this.s[3] = JSBI.asUintN(64, rotl(this.s[3], 45));
        return result;
    }
    next = () => {
        return new BigNumber(this.roll().toString());
    };
    nextDouble = () => {
        return new BigNumber(this.roll().toString()).div(MAX_UINT64 + 1);
    };
    nextInt = (low, high) => {
        return Math.floor((this.nextDouble().toNumber() * (high - low + 1)) + low);
    };
    nextByte = () => this.nextInt(0, 255);
    nextData = (count) => ([...new Array(count)].map(() => this.nextByte()));
}

const chooseDegree = (seqLenth, rng) => {
    const degreeProbabilities = [...new Array(seqLenth)].map((_, index) => 1 / (index + 1));
    const degreeChooser = randomSampler(degreeProbabilities, null, rng.nextDouble);
    return degreeChooser.next() + 1;
};
const shuffle = (items, rng) => {
    let remaining = [...items];
    let result = [];
    while (remaining.length > 0) {
        let index = rng.nextInt(0, remaining.length - 1);
        let item = remaining[index];
        // remaining.erase(remaining.begin() + index);
        remaining.splice(index, 1);
        result.push(item);
    }
    return result;
};
const chooseFragments = (seqNum, seqLength, checksum) => {
    // The first `seqLenth` parts are the "pure" fragments, not mixed with any
    // others. This means that if you only generate the first `seqLenth` parts,
    // then you have all the parts you need to decode the message.
    if (seqNum <= seqLength) {
        return [seqNum - 1];
    }
    else {
        const seed = buffer.Buffer.concat([intToBytes(seqNum), intToBytes(checksum)]);
        const rng = new Xoshiro(seed);
        const degree = chooseDegree(seqLength, rng);
        const indexes = [...new Array(seqLength)].map((_, index) => index);
        const shuffledIndexes = shuffle(indexes, rng);
        return shuffledIndexes.slice(0, degree);
    }
};

class FountainEncoderPart {
    _seqNum;
    _seqLength;
    _messageLength;
    _checksum;
    _fragment;
    constructor(_seqNum, _seqLength, _messageLength, _checksum, _fragment) {
        this._seqNum = _seqNum;
        this._seqLength = _seqLength;
        this._messageLength = _messageLength;
        this._checksum = _checksum;
        this._fragment = _fragment;
    }
    get messageLength() { return this._messageLength; }
    get fragment() { return this._fragment; }
    get seqNum() { return this._seqNum; }
    get seqLength() { return this._seqLength; }
    get checksum() { return this._checksum; }
    cbor() {
        const result = cborEncode([
            this._seqNum,
            this._seqLength,
            this._messageLength,
            this._checksum,
            this._fragment
        ]);
        return buffer.Buffer.from(result);
    }
    description() {
        return `seqNum:${this._seqNum}, seqLen:${this._seqLength}, messageLen:${this._messageLength}, checksum:${this._checksum}, data:${this._fragment.toString('hex')}`;
    }
    static fromCBOR(cborPayload) {
        const [seqNum, seqLength, messageLength, checksum, fragment,] = cborDecode(cborPayload);
        if (typeof seqNum !== 'number' || typeof seqLength !== 'number' || typeof messageLength !== 'number' || typeof checksum !== 'number' || buffer.Buffer.isBuffer(fragment) && fragment.length <= 0) {
            throw new Error("type error");
        }
        return new FountainEncoderPart(seqNum, seqLength, messageLength, checksum, buffer.Buffer.from(fragment));
    }
}
class FountainEncoder {
    _messageLength;
    _fragments;
    fragmentLength;
    seqNum;
    checksum;
    constructor(message, maxFragmentLength = 100, firstSeqNum = 0, minFragmentLength = 10) {
        const fragmentLength = FountainEncoder.findNominalFragmentLength(message.length, minFragmentLength, maxFragmentLength);
        this._messageLength = message.length;
        this._fragments = FountainEncoder.partitionMessage(message, fragmentLength);
        this.fragmentLength = fragmentLength;
        this.seqNum = toUint32(firstSeqNum);
        this.checksum = getCRC(message);
    }
    get fragmentsLength() { return this._fragments.length; }
    get fragments() { return this._fragments; }
    get messageLength() { return this._messageLength; }
    isComplete() {
        return this.seqNum >= this._fragments.length;
    }
    isSinglePart() {
        return this._fragments.length === 1;
    }
    seqLength() {
        return this._fragments.length;
    }
    mix(indexes) {
        return indexes.reduce((result, index) => bufferXOR(this._fragments[index], result), buffer.Buffer.alloc(this.fragmentLength, 0));
    }
    nextPart() {
        this.seqNum = toUint32(this.seqNum + 1);
        const indexes = chooseFragments(this.seqNum, this._fragments.length, this.checksum);
        const mixed = this.mix(indexes);
        return new FountainEncoderPart(this.seqNum, this._fragments.length, this._messageLength, this.checksum, mixed);
    }
    static findNominalFragmentLength(messageLength, minFragmentLength, maxFragmentLength) {
        if (messageLength <= 0 || minFragmentLength <= 0 || maxFragmentLength < minFragmentLength) {
            throw new Error("invalid fragment or message length");
        }
        const maxFragmentCount = Math.ceil(messageLength / minFragmentLength);
        let fragmentLength = 0;
        for (let fragmentCount = 1; fragmentCount <= maxFragmentCount; fragmentCount++) {
            fragmentLength = Math.ceil(messageLength / fragmentCount);
            if (fragmentLength <= maxFragmentLength) {
                break;
            }
        }
        return fragmentLength;
    }
    static partitionMessage(message, fragmentLength) {
        let remaining = buffer.Buffer.from(message);
        let fragment;
        let _fragments = [];
        while (remaining.length > 0) {
            [fragment, remaining] = split(remaining, -fragmentLength);
            fragment = buffer.Buffer
                .alloc(fragmentLength, 0) // initialize with 0's to achieve the padding
                .fill(fragment, 0, fragment.length);
            _fragments.push(fragment);
        }
        return _fragments;
    }
}

const bytewords = 'ableacidalsoapexaquaarchatomauntawayaxisbackbaldbarnbeltbetabiasbluebodybragbrewbulbbuzzcalmcashcatschefcityclawcodecolacookcostcruxcurlcuspcyandarkdatadaysdelidicedietdoordowndrawdropdrumdulldutyeacheasyechoedgeepicevenexamexiteyesfactfairfernfigsfilmfishfizzflapflewfluxfoxyfreefrogfuelfundgalagamegeargemsgiftgirlglowgoodgraygrimgurugushgyrohalfhanghardhawkheathelphighhillholyhopehornhutsicedideaidleinchinkyintoirisironitemjadejazzjoinjoltjowljudojugsjumpjunkjurykeepkenokeptkeyskickkilnkingkitekiwiknoblamblavalazyleaflegsliarlimplionlistlogoloudloveluaulucklungmainmanymathmazememomenumeowmildmintmissmonknailnavyneednewsnextnoonnotenumbobeyoboeomitonyxopenovalowlspaidpartpeckplaypluspoempoolposepuffpumapurrquadquizraceramprealredorichroadrockroofrubyruinrunsrustsafesagascarsetssilkskewslotsoapsolosongstubsurfswantacotasktaxitenttiedtimetinytoiltombtoystriptunatwinuglyundouniturgeuservastveryvetovialvibeviewvisavoidvowswallwandwarmwaspwavewaxywebswhatwhenwhizwolfworkyankyawnyellyogayurtzapszerozestzinczonezoom';
let bytewordsLookUpTable = [];
const BYTEWORDS_NUM = 256;
const BYTEWORD_LENGTH = 4;
const MINIMAL_BYTEWORD_LENGTH = 2;
var STYLES;
(function (STYLES) {
    STYLES["STANDARD"] = "standard";
    STYLES["URI"] = "uri";
    STYLES["MINIMAL"] = "minimal";
})(STYLES || (STYLES = {}));
const getWord = (index) => {
    return bytewords.slice(index * BYTEWORD_LENGTH, (index * BYTEWORD_LENGTH) + BYTEWORD_LENGTH);
};
const getMinimalWord = (index) => {
    const byteword = getWord(index);
    return `${byteword[0]}${byteword[BYTEWORD_LENGTH - 1]}`;
};
const addCRC = (string) => {
    const crc = getCRCHex(buffer.Buffer.from(string, 'hex'));
    return `${string}${crc}`;
};
const encodeWithSeparator = (word, separator) => {
    const crcAppendedWord = addCRC(word);
    const crcWordBuff = buffer.Buffer.from(crcAppendedWord, 'hex');
    const result = crcWordBuff.reduce((result, w) => ([...result, getWord(w)]), []);
    return result.join(separator);
};
const encodeMinimal = (word) => {
    const crcAppendedWord = addCRC(word);
    const crcWordBuff = buffer.Buffer.from(crcAppendedWord, 'hex');
    const result = crcWordBuff.reduce((result, w) => result + getMinimalWord(w), '');
    return result;
};
const decodeWord = (word, wordLength) => {
    if (word.length !== wordLength) {
        throw new Error("'Invalid Bytewords: word.length does not match wordLength provided'");
    }
    const dim = 26;
    // Since the first and last letters of each Byteword are unique,
    // we can use them as indexes into a two-dimensional lookup table.
    // This table is generated lazily.
    if (bytewordsLookUpTable.length === 0) {
        const array_len = dim * dim;
        bytewordsLookUpTable = [...new Array(array_len)].map(() => -1);
        for (let i = 0; i < BYTEWORDS_NUM; i++) {
            const byteword = getWord(i);
            let x = byteword[0].charCodeAt(0) - 'a'.charCodeAt(0);
            let y = byteword[3].charCodeAt(0) - 'a'.charCodeAt(0);
            let offset = y * dim + x;
            bytewordsLookUpTable[offset] = i;
        }
    }
    // If the coordinates generated by the first and last letters are out of bounds,
    // or the lookup table contains -1 at the coordinates, then the word is not valid.
    let x = (word[0]).toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0);
    let y = (word[wordLength == 4 ? 3 : 1]).toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0);
    if (!(0 <= x && x < dim && 0 <= y && y < dim)) {
        throw new Error("Invalid Bytewords: invalid word");
    }
    let offset = y * dim + x;
    let value = bytewordsLookUpTable[offset];
    if (value === -1) {
        throw new Error("Invalid Bytewords: value not in lookup table");
    }
    // If we're decoding a full four-letter word, verify that the two middle letters are correct.
    if (wordLength == BYTEWORD_LENGTH) {
        const byteword = getWord(value);
        let c1 = word[1].toLowerCase();
        let c2 = word[2].toLowerCase();
        if (!(c1 === byteword[1] && c2 === byteword[2])) {
            throw new Error("Invalid Bytewords: invalid middle letters of word");
        }
    }
    // Successful decode.
    return buffer.Buffer.from([value]).toString('hex');
};
const _decode = (string, separator, wordLength) => {
    const words = wordLength == BYTEWORD_LENGTH ? string.split(separator) : partition(string, 2);
    const decodedString = words.map((word) => decodeWord(word, wordLength)).join('');
    if (decodedString.length < 5) {
        throw new Error("Invalid Bytewords: invalid decoded string length");
    }
    const [body, bodyChecksum] = split(buffer.Buffer.from(decodedString, 'hex'), 4);
    const checksum = getCRCHex(body); // convert to hex
    if (checksum !== bodyChecksum.toString('hex')) {
        throw new Error("Invalid Checksum");
    }
    return body.toString('hex');
};
const decode = (string, style = STYLES.MINIMAL) => {
    switch (style) {
        case STYLES.STANDARD:
            return _decode(string, ' ', BYTEWORD_LENGTH);
        case STYLES.URI:
            return _decode(string, '-', BYTEWORD_LENGTH);
        case STYLES.MINIMAL:
            return _decode(string, '', MINIMAL_BYTEWORD_LENGTH);
        default:
            throw new Error(`Invalid style ${style}`);
    }
};
const encode = (string, style = STYLES.MINIMAL) => {
    switch (style) {
        case STYLES.STANDARD:
            return encodeWithSeparator(string, ' ');
        case STYLES.URI:
            return encodeWithSeparator(string, '-');
        case STYLES.MINIMAL:
            return encodeMinimal(string);
        default:
            throw new Error(`Invalid style ${style}`);
    }
};
var bytewords$1 = {
    decode,
    encode,
    STYLES
};

class UREncoder {
    ur;
    fountainEncoder;
    constructor(_ur, maxFragmentLength, firstSeqNum, minFragmentLength) {
        this.ur = _ur;
        this.fountainEncoder = new FountainEncoder(_ur.cbor, maxFragmentLength, firstSeqNum, minFragmentLength);
    }
    get fragmentsLength() { return this.fountainEncoder.fragmentsLength; }
    get fragments() { return this.fountainEncoder.fragments; }
    get messageLength() { return this.fountainEncoder.messageLength; }
    get cbor() { return this.ur.cbor; }
    encodeWhole() {
        return [...new Array(this.fragmentsLength)].map(() => this.nextPart());
    }
    nextPart() {
        const part = this.fountainEncoder.nextPart();
        if (this.fountainEncoder.isSinglePart()) {
            return UREncoder.encodeSinglePart(this.ur);
        }
        else {
            return UREncoder.encodePart(this.ur.type, part);
        }
    }
    static encodeUri(scheme, pathComponents) {
        const path = pathComponents.join('/');
        return [scheme, path].join(':');
    }
    static encodeUR(pathComponents) {
        return UREncoder.encodeUri('ur', pathComponents);
    }
    static encodePart(type, part) {
        const seq = `${part.seqNum}-${part.seqLength}`;
        const body = bytewords$1.encode(part.cbor().toString('hex'), bytewords$1.STYLES.MINIMAL);
        return UREncoder.encodeUR([type, seq, body]);
    }
    static encodeSinglePart(ur) {
        const body = bytewords$1.encode(ur.cbor.toString('hex'), bytewords$1.STYLES.MINIMAL);
        return UREncoder.encodeUR([ur.type, body]);
    }
}

class FountainDecoderPart {
    _indexes;
    _fragment;
    constructor(_indexes, _fragment) {
        this._indexes = _indexes;
        this._fragment = _fragment;
    }
    get indexes() { return this._indexes; }
    get fragment() { return this._fragment; }
    static fromEncoderPart(encoderPart) {
        const indexes = chooseFragments(encoderPart.seqNum, encoderPart.seqLength, encoderPart.checksum);
        const fragment = encoderPart.fragment;
        return new FountainDecoderPart(indexes, fragment);
    }
    isSimple() {
        return this.indexes.length === 1;
    }
}
class FountainDecoder {
    error;
    result = undefined;
    expectedMessageLength = 0;
    expectedChecksum = 0;
    expectedFragmentLength = 0;
    processedPartsCount = 0;
    expectedPartIndexes = [];
    lastPartIndexes = [];
    queuedParts = [];
    receivedPartIndexes = [];
    mixedParts = [];
    simpleParts = [];
    validatePart(part) {
        // If this is the first part we've seen
        if (this.expectedPartIndexes.length === 0) {
            // Record the things that all the other parts we see will have to match to be valid.
            [...new Array(part.seqLength)]
                .forEach((_, index) => this.expectedPartIndexes.push(index));
            this.expectedMessageLength = part.messageLength;
            this.expectedChecksum = part.checksum;
            this.expectedFragmentLength = part.fragment.length;
        }
        else {
            // If this part's values don't match the first part's values, throw away the part
            if (this.expectedPartIndexes.length !== part.seqLength) {
                return false;
            }
            if (this.expectedMessageLength !== part.messageLength) {
                return false;
            }
            if (this.expectedChecksum !== part.checksum) {
                return false;
            }
            if (this.expectedFragmentLength !== part.fragment.length) {
                return false;
            }
        }
        // This part should be processed
        return true;
    }
    reducePartByPart(a, b) {
        // If the fragments mixed into `b` are a strict (proper) subset of those in `a`...
        if (arrayContains(a.indexes, b.indexes)) {
            const newIndexes = setDifference(a.indexes, b.indexes);
            const newFragment = bufferXOR(a.fragment, b.fragment);
            return new FountainDecoderPart(newIndexes, newFragment);
        }
        else {
            // `a` is not reducable by `b`, so return a
            return a;
        }
    }
    reduceMixedBy(part) {
        const newMixed = [];
        this.mixedParts
            .map(({ value: mixedPart }) => this.reducePartByPart(mixedPart, part))
            .forEach(reducedPart => {
            if (reducedPart.isSimple()) {
                this.queuedParts.push(reducedPart);
            }
            else {
                newMixed.push({ key: reducedPart.indexes, value: reducedPart });
            }
        });
        this.mixedParts = newMixed;
    }
    processSimplePart(part) {
        // Don't process duplicate parts
        const fragmentIndex = part.indexes[0];
        if (this.receivedPartIndexes.includes(fragmentIndex)) {
            return;
        }
        this.simpleParts.push({ key: part.indexes, value: part });
        this.receivedPartIndexes.push(fragmentIndex);
        // If we've received all the parts
        if (arraysEqual(this.receivedPartIndexes, this.expectedPartIndexes)) {
            // Reassemble the message from its fragments
            const sortedParts = this.simpleParts
                .map(({ value }) => value)
                .sort((a, b) => (a.indexes[0] - b.indexes[0]));
            const message = FountainDecoder.joinFragments(sortedParts.map(part => part.fragment), this.expectedMessageLength);
            const checksum = getCRC(message);
            if (checksum === this.expectedChecksum) {
                this.result = message;
            }
            else {
                this.error = new InvalidChecksumError();
            }
        }
        else {
            this.reduceMixedBy(part);
        }
    }
    processMixedPart(part) {
        // Don't process duplicate parts
        if (this.mixedParts.some(({ key: indexes }) => arraysEqual(indexes, part.indexes))) {
            return;
        }
        // Reduce this part by all the others
        let p2 = this.simpleParts.reduce((acc, { value: p }) => this.reducePartByPart(acc, p), part);
        p2 = this.mixedParts.reduce((acc, { value: p }) => this.reducePartByPart(acc, p), p2);
        // If the part is now simple
        if (p2.isSimple()) {
            // Add it to the queue
            this.queuedParts.push(p2);
        }
        else {
            this.reduceMixedBy(p2);
            this.mixedParts.push({ key: p2.indexes, value: p2 });
        }
    }
    processQueuedItem() {
        if (this.queuedParts.length === 0) {
            return;
        }
        const part = this.queuedParts.shift();
        if (part.isSimple()) {
            this.processSimplePart(part);
        }
        else {
            this.processMixedPart(part);
        }
    }
    static joinFragments = (fragments, messageLength) => {
        return buffer.Buffer.concat(fragments).slice(0, messageLength);
    };
    receivePart(encoderPart) {
        if (this.isComplete()) {
            return false;
        }
        if (!this.validatePart(encoderPart)) {
            return false;
        }
        const decoderPart = FountainDecoderPart.fromEncoderPart(encoderPart);
        this.lastPartIndexes = decoderPart.indexes;
        this.queuedParts.push(decoderPart);
        while (!this.isComplete() && this.queuedParts.length > 0) {
            this.processQueuedItem();
        }
        this.processedPartsCount += 1;
        return true;
    }
    isComplete() {
        return Boolean(this.result !== undefined && this.result.length > 0);
    }
    isSuccess() {
        return Boolean(this.error === undefined && this.isComplete());
    }
    resultMessage() {
        return this.isSuccess() ? this.result : buffer.Buffer.from([]);
    }
    isFailure() {
        return this.error !== undefined;
    }
    resultError() {
        return this.error ? this.error.message : '';
    }
    expectedPartCount() {
        return this.expectedPartIndexes.length;
    }
    getExpectedPartIndexes() {
        return [...this.expectedPartIndexes];
    }
    getReceivedPartIndexes() {
        return [...this.receivedPartIndexes];
    }
    getLastPartIndexes() {
        return [...this.lastPartIndexes];
    }
    estimatedPercentComplete() {
        if (this.isComplete()) {
            return 1;
        }
        const expectedPartCount = this.expectedPartCount();
        if (expectedPartCount === 0) {
            return 0;
        }
        // We multiply the expectedPartCount by `1.75` as a way to compensate for the facet
        // that `this.processedPartsCount` also tracks the duplicate parts that have been
        // processeed.
        return Math.min(0.99, this.processedPartsCount / (expectedPartCount * 1.75));
    }
    getProgress() {
        if (this.isComplete()) {
            return 1;
        }
        const expectedPartCount = this.expectedPartCount();
        if (expectedPartCount === 0) {
            return 0;
        }
        return this.receivedPartIndexes.length / expectedPartCount;
    }
}

class URDecoder {
    fountainDecoder;
    type;
    expected_type;
    result;
    error;
    constructor(fountainDecoder = new FountainDecoder(), type = 'bytes') {
        this.fountainDecoder = fountainDecoder;
        this.type = type;
        if (!isURType(type)) {
            throw new Error("Invalid UR type");
        }
        this.expected_type = '';
    }
    static decodeBody(type, message) {
        const cbor = bytewords$1.decode(message, bytewords$1.STYLES.MINIMAL);
        return new UR(buffer.Buffer.from(cbor, 'hex'), type);
    }
    validatePart(type) {
        if (this.expected_type) {
            return this.expected_type === type;
        }
        if (!isURType(type)) {
            return false;
        }
        this.expected_type = type;
        return true;
    }
    static decode(message) {
        const [type, components] = this.parse(message);
        if (components.length === 0) {
            throw new InvalidPathLengthError();
        }
        const body = components[0];
        return URDecoder.decodeBody(type, body);
    }
    static parse(message) {
        const lowercase = message.toLowerCase();
        const prefix = lowercase.slice(0, 3);
        if (prefix !== 'ur:') {
            throw new InvalidSchemeError();
        }
        const components = lowercase.slice(3).split('/');
        const type = components[0];
        if (components.length < 2) {
            throw new InvalidPathLengthError();
        }
        if (!isURType(type)) {
            throw new InvalidTypeError();
        }
        return [type, components.slice(1)];
    }
    static parseSequenceComponent(s) {
        const components = s.split('-');
        if (components.length !== 2) {
            throw new InvalidSequenceComponentError();
        }
        const seqNum = toUint32(Number(components[0]));
        const seqLength = Number(components[1]);
        if (seqNum < 1 || seqLength < 1) {
            throw new InvalidSequenceComponentError();
        }
        return [seqNum, seqLength];
    }
    receivePart(s) {
        if (this.result !== undefined) {
            return false;
        }
        const [type, components] = URDecoder.parse(s);
        if (!this.validatePart(type)) {
            return false;
        }
        // If this is a single-part UR then we're done
        if (components.length === 1) {
            this.result = URDecoder.decodeBody(type, components[0]);
            return true;
        }
        if (components.length !== 2) {
            throw new InvalidPathLengthError();
        }
        const [seq, fragment] = components;
        const [seqNum, seqLength] = URDecoder.parseSequenceComponent(seq);
        const cbor = bytewords$1.decode(fragment, bytewords$1.STYLES.MINIMAL);
        const part = FountainEncoderPart.fromCBOR(cbor);
        if (seqNum !== part.seqNum || seqLength !== part.seqLength) {
            return false;
        }
        if (!this.fountainDecoder.receivePart(part)) {
            return false;
        }
        if (this.fountainDecoder.isSuccess()) {
            this.result = new UR(this.fountainDecoder.resultMessage(), type);
        }
        else if (this.fountainDecoder.isFailure()) {
            this.error = new InvalidSchemeError();
        }
        return true;
    }
    resultUR() {
        return this.result ? this.result : new UR(buffer.Buffer.from([]));
    }
    isComplete() {
        return this.result && this.result.cbor.length > 0 ? true : false;
    }
    isSuccess() {
        return !this.error && this.isComplete();
    }
    isError() {
        return this.error !== undefined;
    }
    resultError() {
        return this.error ? this.error.message : '';
    }
    expectedPartCount() {
        return this.fountainDecoder.expectedPartCount();
    }
    expectedPartIndexes() {
        return this.fountainDecoder.getExpectedPartIndexes();
    }
    receivedPartIndexes() {
        return this.fountainDecoder.getReceivedPartIndexes();
    }
    lastPartIndexes() {
        return this.fountainDecoder.getLastPartIndexes();
    }
    estimatedPercentComplete() {
        return this.fountainDecoder.estimatedPercentComplete();
    }
    getProgress() {
        return this.fountainDecoder.getProgress();
    }
}

exports.UR = UR;
exports.URDecoder = URDecoder;
exports.UREncoder = UREncoder;
