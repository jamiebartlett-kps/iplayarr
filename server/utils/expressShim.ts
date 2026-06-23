import {
    getHeader,
    getQuery,
    getRequestHost,
    getRequestProtocol,
    type H3Event,
    readMultipartFormData,
    setResponseHeader,
    setResponseStatus,
} from 'h3';

// Minimal Express-compatible req/res over an H3Event so the original /api
// endpoint handlers (XML, NZB, multer, action dispatch) run verbatim, preserving
// byte-for-byte response bodies AND headers. Express's res.send appends
// "; charset=utf-8" to the Content-Type, and res.json uses compact stringify
// with "application/json; charset=utf-8" — both replicated here.

function setCharset(type: string, charset: string): string {
    if (!type) return type;
    if (/;\s*charset=/i.test(type)) {
        return type.replace(/;\s*charset=[^;]*/i, `; charset=${charset}`);
    }
    return `${type}; charset=${charset}`;
}

interface ShimResult {
    status: number;
    headers: Record<string, string>;
    body: any;
    isJson: boolean;
}

export async function createApiShim(event: H3Event) {
    const query: any = getQuery(event);

    // Replicate `multer().any()` applied to the whole /api route: parse any
    // multipart body into req.files with the Multer.File fields the endpoints use.
    let files: any[] = [];
    const method = event.method;
    const contentType = getHeader(event, 'content-type') || '';
    if (method !== 'GET' && method !== 'HEAD' && contentType.includes('multipart/form-data')) {
        const parts = (await readMultipartFormData(event)) || [];
        files = parts
            .filter((p) => p.filename != null)
            .map((p) => ({
                fieldname: p.name,
                originalname: p.filename,
                mimetype: p.type || 'application/octet-stream',
                buffer: p.data,
                size: p.data.length,
            }));
    }

    const hostHeader = getRequestHost(event) || '';
    const req: any = {
        query,
        files,
        protocol: getRequestProtocol(event),
        hostname: hostHeader.split(':')[0],
        socket: { localPort: event.node.req.socket?.localPort },
        get: (name: string) => getHeader(event, name.toLowerCase()),
    };

    const result: ShimResult = { status: 200, headers: {}, body: undefined, isJson: false };

    const res: any = {
        status(code: number) {
            result.status = code;
            return res;
        },
        set(field: string, value: string) {
            result.headers[field] = value;
            return res;
        },
        setHeader(field: string, value: string) {
            result.headers[field] = value;
            return res;
        },
        json(obj: any) {
            result.isJson = true;
            result.headers['Content-Type'] = 'application/json; charset=utf-8';
            result.body = obj;
            return res;
        },
        send(data: any) {
            if (typeof data === 'object' && data !== null && !Buffer.isBuffer(data)) {
                // express res.send(object) behaves like res.json(object)
                result.isJson = true;
                result.headers['Content-Type'] = 'application/json; charset=utf-8';
                result.body = data;
            } else {
                const existing = result.headers['Content-Type'] || result.headers['content-type'];
                result.headers['Content-Type'] = setCharset(existing || 'text/html', 'utf-8');
                delete result.headers['content-type'];
                result.body = data;
            }
            return res;
        },
        end() {
            return res;
        },
    };

    const done = () => {
        setResponseStatus(event, result.status);
        for (const [k, v] of Object.entries(result.headers)) {
            setResponseHeader(event, k, v as string);
        }
        return result.isJson ? JSON.stringify(result.body) : result.body;
    };

    return { req, res, done };
}
