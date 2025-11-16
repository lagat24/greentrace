import { decodeUtf8, uint8Array } from './text.js';
export function cast(field, value) {
    if (value == null) {
        return value;
    }
    if (isBigInt(field)) {
        return value;
    }
    if (isDateOrTime(field)) {
        return value;
    }
    if (isDecimal(field)) {
        return value;
    }
    if (isJson(field)) {
        return JSON.parse(decodeUtf8(value));
    }
    if (isIntegral(field)) {
        return parseInt(value, 10);
    }
    if (isFloat(field)) {
        return parseFloat(value);
    }
    if (isBinary(field)) {
        return uint8Array(value);
    }
    return decodeUtf8(value);
}
const BIG_INT_FIELD_TYPES = ['INT64', 'UINT64'];
function isBigInt(field) {
    return BIG_INT_FIELD_TYPES.includes(field.type);
}
const DATE_OR_DATETIME_FIELD_TYPES = ['DATETIME', 'DATE', 'TIMESTAMP', 'TIME'];
function isDateOrTime(field) {
    return DATE_OR_DATETIME_FIELD_TYPES.includes(field.type);
}
function isDecimal(field) {
    return field.type === 'DECIMAL';
}
function isJson(field) {
    return field.type === 'JSON';
}
const INTEGRAL_FIELD_TYPES = ['INT8', 'INT16', 'INT24', 'INT32', 'UINT8', 'UINT16', 'UINT24', 'UINT32', 'YEAR'];
function isIntegral(field) {
    return INTEGRAL_FIELD_TYPES.includes(field.type);
}
const FLOAT_FIELD_TYPES = ['FLOAT32', 'FLOAT64'];
function isFloat(field) {
    return FLOAT_FIELD_TYPES.includes(field.type);
}
const BinaryId = 63;
function isBinary(field) {
    return field.charset === BinaryId;
}
