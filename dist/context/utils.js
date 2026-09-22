"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRequestBody = parseRequestBody;
exports.searchParamsToObject = searchParamsToObject;
async function parseRequestBody(req) {
    if (req.method === "GET" || req.method === "HEAD")
        return null;
    const chunks = [];
    for await (const chunk of req)
        chunks.push(chunk);
    if (!chunks.length)
        return null;
    const raw = Buffer.concat(chunks);
    return raw;
}
function searchParamsToObject(searchParams) {
    const params = {};
    for (const [key, value] of searchParams.entries()) {
        if (params[key] !== undefined) {
            if (!Array.isArray(params[key])) {
                params[key] = [params[key]];
            }
            params[key].push(value);
        }
        else {
            params[key] = value;
        }
    }
    return params;
}
