import { cast } from './cast.js';
export { cast } from './cast.js';
import { format } from './sanitization.js';
export { format } from './sanitization.js';
export { hex } from './text.js';
type Row<T extends ExecuteAs = 'object'> = T extends 'array' ? any[] : T extends 'object' ? Record<string, any> : never;
interface VitessError {
    message: string;
    code: string;
}
export declare class DatabaseError extends Error {
    body: VitessError;
    status: number;
    constructor(message: string, status: number, body: VitessError);
}
type Types = Record<string, string>;
export interface ExecutedQuery<T = Row<'array'> | Row<'object'>> {
    headers: string[];
    types: Types;
    rows: T[];
    fields: Field[];
    size: number;
    statement: string;
    insertId: string;
    rowsAffected: number;
    time: number;
}
type Fetch = (input: string, init?: Req) => Promise<Res>;
type Req = {
    method: string;
    headers: Record<string, string>;
    body: string;
    cache?: RequestCache;
};
type Res = {
    ok: boolean;
    status: number;
    statusText: string;
    json(): Promise<any>;
    text(): Promise<string>;
};
export type Cast = typeof cast;
type Format = typeof format;
export interface Config {
    url?: string;
    username?: string;
    password?: string;
    host?: string;
    fetch?: Fetch;
    format?: Format;
    cast?: Cast;
}
export interface Field {
    name: string;
    type: string;
    table?: string;
    orgTable?: string | null;
    database?: string | null;
    orgName?: string | null;
    columnLength?: number | null;
    charset?: number | null;
    decimals?: number;
    flags?: number | null;
    columnType?: string | null;
}
type ExecuteAs = 'array' | 'object';
type ExecuteArgs = Record<string, any> | any[] | null;
type ExecuteOptions<T extends ExecuteAs = 'object'> = T extends 'array' ? {
    as?: 'object';
    cast?: Cast;
} : T extends 'object' ? {
    as: 'array';
    cast?: Cast;
} : never;
export declare class Client {
    readonly config: Config;
    constructor(config: Config);
    transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
    execute<T = Row<'object'>>(query: string, args?: ExecuteArgs, options?: ExecuteOptions<'object'>): Promise<ExecutedQuery<T>>;
    execute<T = Row<'array'>>(query: string, args: ExecuteArgs, options: ExecuteOptions<'array'>): Promise<ExecutedQuery<T>>;
    connection(): Connection;
}
export type Transaction = Tx;
declare class Tx {
    private conn;
    constructor(conn: Connection);
    execute<T = Row<'object'>>(query: string, args?: ExecuteArgs, options?: ExecuteOptions<'object'>): Promise<ExecutedQuery<T>>;
    execute<T = Row<'array'>>(query: string, args: ExecuteArgs, options: ExecuteOptions<'array'>): Promise<ExecutedQuery<T>>;
}
export declare class Connection {
    readonly config: Config;
    private fetch;
    private session;
    private url;
    constructor(config: Config);
    transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
    refresh(): Promise<void>;
    execute<T = Row<'object'>>(query: string, args?: ExecuteArgs, options?: ExecuteOptions<'object'>): Promise<ExecutedQuery<T>>;
    execute<T = Row<'array'>>(query: string, args: ExecuteArgs, options: ExecuteOptions<'array'>): Promise<ExecutedQuery<T>>;
    private createSession;
}
export declare function connect(config: Config): Connection;
