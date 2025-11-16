import { cast } from './cast.js';
export { cast } from './cast.js';
import { format } from './sanitization.js';
export { format } from './sanitization.js';
export { hex } from './text.js';
import { Version } from './version.js';
export class DatabaseError extends Error {
    constructor(message, status, body) {
        super(message);
        this.status = status;
        this.name = 'DatabaseError';
        this.body = body;
    }
}
export class Client {
    constructor(config) {
        this.config = config;
    }
    async transaction(fn) {
        return this.connection().transaction(fn);
    }
    async execute(query, args = null, options = { as: 'object' }) {
        return this.connection().execute(query, args, options);
    }
    connection() {
        return new Connection(this.config);
    }
}
class Tx {
    constructor(conn) {
        this.conn = conn;
    }
    async execute(query, args = null, options = { as: 'object' }) {
        return this.conn.execute(query, args, options);
    }
}
function protocol(protocol) {
    return protocol === 'http:' ? protocol : 'https:';
}
function buildURL(url) {
    const scheme = `${protocol(url.protocol)}//`;
    return new URL(url.pathname, `${scheme}${url.host}`).toString();
}
export class Connection {
    constructor(config) {
        this.config = config;
        this.fetch = config.fetch || fetch;
        this.session = null;
        if (config.url) {
            const url = new URL(config.url);
            this.config.username = url.username;
            this.config.password = url.password;
            this.config.host = url.hostname;
            this.url = buildURL(url);
        }
        else {
            this.url = new URL(`https://${this.config.host}`).toString();
        }
    }
    async transaction(fn) {
        const conn = new Connection(this.config);
        const tx = new Tx(conn);
        try {
            await tx.execute('BEGIN');
            const res = await fn(tx);
            await tx.execute('COMMIT');
            return res;
        }
        catch (err) {
            await tx.execute('ROLLBACK');
            throw err;
        }
    }
    async refresh() {
        await this.createSession();
    }
    async execute(query, args = null, options = { as: 'object' }) {
        const url = new URL('/psdb.v1alpha1.Database/Execute', this.url);
        const formatter = this.config.format || format;
        const sql = args ? formatter(query, args) : query;
        const saved = await postJSON(this.config, this.fetch, url, {
            query: sql,
            session: this.session
        });
        const { result, session, error, timing } = saved;
        if (session) {
            this.session = session;
        }
        if (error) {
            throw new DatabaseError(error.message, 400, error);
        }
        const rowsAffected = result?.rowsAffected ? parseInt(result.rowsAffected, 10) : 0;
        const insertId = result?.insertId ?? '0';
        const fields = result?.fields ?? [];
        for (const field of fields) {
            field.type || (field.type = 'NULL');
        }
        const castFn = options.cast || this.config.cast || cast;
        const rows = result ? parse(result, castFn, options.as || 'object') : [];
        const headers = fields.map((f) => f.name);
        const typeByName = (acc, { name, type }) => ({ ...acc, [name]: type });
        const types = fields.reduce(typeByName, {});
        const timingSeconds = timing ?? 0;
        return {
            headers,
            types,
            fields,
            rows,
            rowsAffected,
            insertId,
            size: rows.length,
            statement: sql,
            time: timingSeconds * 1000
        };
    }
    async createSession() {
        const url = new URL('/psdb.v1alpha1.Database/CreateSession', this.url);
        const { session } = await postJSON(this.config, this.fetch, url);
        this.session = session;
        return session;
    }
}
async function postJSON(config, fetch, url, body = {}) {
    const auth = btoa(`${config.username}:${config.password}`);
    const response = await fetch(url.toString(), {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': `database-js/${Version}`,
            Authorization: `Basic ${auth}`
        },
        cache: 'no-store'
    });
    if (response.ok) {
        return await response.json();
    }
    else {
        let error = null;
        try {
            const e = (await response.json()).error;
            error = new DatabaseError(e.message, response.status, e);
        }
        catch {
            error = new DatabaseError(response.statusText, response.status, {
                code: 'internal',
                message: response.statusText
            });
        }
        throw error;
    }
}
export function connect(config) {
    return new Connection(config);
}
function parseArrayRow(fields, rawRow, cast) {
    const row = decodeRow(rawRow);
    return fields.map((field, ix) => {
        return cast(field, row[ix]);
    });
}
function parseObjectRow(fields, rawRow, cast) {
    const row = decodeRow(rawRow);
    return fields.reduce((acc, field, ix) => {
        acc[field.name] = cast(field, row[ix]);
        return acc;
    }, {});
}
function parse(result, cast, returnAs) {
    const fields = result.fields ?? [];
    const rows = result.rows ?? [];
    return rows.map((row) => returnAs === 'array' ? parseArrayRow(fields, row, cast) : parseObjectRow(fields, row, cast));
}
function decodeRow(row) {
    const values = row.values ? atob(row.values) : '';
    let offset = 0;
    return row.lengths.map((size) => {
        const width = parseInt(size, 10);
        if (width < 0)
            return null;
        const splice = values.substring(offset, offset + width);
        offset += width;
        return splice;
    });
}
