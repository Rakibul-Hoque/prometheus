export function joinPaths(prefix: string, path: string): string {
    const left = prefix || "";
    const right = path || "/";
    let result = left + right;

    if (!result.startsWith("/")) result = "/" + result;
    result = result.replace(/\/+/g, "/");

    if (result.length > 1 && result.endsWith("/")) result = result.slice(0, -1);

    return result;
}
