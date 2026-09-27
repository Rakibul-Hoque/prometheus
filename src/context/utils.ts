export function searchParamsToObject(
    searchParams: URLSearchParams
): Record<string, string | string[]> {
    const params: Record<string, string | string[]> = {};
    for (const [key, value] of searchParams.entries()) {
        const existing = params[key];
        if (existing !== undefined) {
            if (Array.isArray(existing)) existing.push(value);
            else params[key] = [existing as string, value];
        } else {
            params[key] = value;
        }
    }
    return params;
}


