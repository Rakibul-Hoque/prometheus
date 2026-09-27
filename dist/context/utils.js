"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchParamsToObject = searchParamsToObject;
function searchParamsToObject(searchParams) {
    const params = {};
    for (const [key, value] of searchParams.entries()) {
        const existing = params[key];
        if (existing !== undefined) {
            if (Array.isArray(existing))
                existing.push(value);
            else
                params[key] = [existing, value];
        }
        else {
            params[key] = value;
        }
    }
    return params;
}
