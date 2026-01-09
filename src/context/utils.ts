

export async function parseRequestBody(req: IncomingMessage): Promise<any> {
    if (req.method === "GET" || req.method === "HEAD") return null;

    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    if (!chunks.length) return null;

    const raw = Buffer.concat(chunks).toString();
    const type = req.headers["content-type"] || "";

    if (type.includes("application/json")) {
        return JSON.parse(raw);
    }

    if (type.includes("application/x-www-form-urlencoded")) {
        return Object.fromEntries(new URLSearchParams(raw));
    }

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
