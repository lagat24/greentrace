"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uint8ArrayToHex = exports.uint8Array = exports.hex = exports.decodeUtf8 = void 0;
const decoder = new TextDecoder('utf-8');
function decodeUtf8(text) {
    return text ? decoder.decode(uint8Array(text)) : '';
}
exports.decodeUtf8 = decodeUtf8;
function hex(text) {
    const digits = bytes(text).map((b) => b.toString(16).padStart(2, '0'));
    return `0x${digits.join('')}`;
}
exports.hex = hex;
function uint8Array(text) {
    return Uint8Array.from(bytes(text));
}
exports.uint8Array = uint8Array;
function uint8ArrayToHex(uint8) {
    const digits = Array.from(uint8).map((i) => i.toString(16).padStart(2, '0'));
    return `x'${digits.join('')}'`;
}
exports.uint8ArrayToHex = uint8ArrayToHex;
function bytes(text) {
    return text.split('').map((c) => c.charCodeAt(0));
}
