export async function parseRequestBody(req: IncomingMessage): Promise<any> {
    if (req.method === "GET" || req.method === "HEAD") return null;

    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    if (!chunks.length) return null;

    const raw = Buffer.concat(chunks).toString();

    return raw;
}

export function searchParamsToObject(searchParams) {
    const params = {};
    for (const [key, value] of searchParams.entries()) {
        if (params[key] !== undefined) {
            if (!Array.isArray(params[key])) {
                params[key] = [params[key]];
            }
            params[key].push(value);
        } else {
            params[key] = value;
        }
    }
    return params;
}
