import type { App, Handler } from "./types";

function getStaticPrefix(path: string) {
    const idx = path.indexOf(":");
    if (idx === -1) return path;
    return path.slice(0, idx - 1);
}

function relativePrefix(app: App, fullPath: string) {
    if (!app.prefix) return getStaticPrefix(fullPath);
    return getStaticPrefix(fullPath.slice(app.prefix.length)) || "/";
}

export function parsePath(path: string) {
    const keys: string[] = [];
    const pattern = path.replace(/:([^\/]+)/g, (_, key) => {
        keys.push(key);
        return "([^/]+)";
    });
    return { pattern: new RegExp("^" + pattern + "$"), keys };
}

export function addRoute(
    method: string,
    path: string,
    handler: Handler,
    app: App
) {
    const fullPath = app.prefix + path;
    const { pattern, keys } = parsePath(fullPath);

    const prefix = relativePrefix(app, fullPath);
    app.use(async (ctx, next) => {
        
        if (ctx.body !== undefined) return next();

        if (ctx.method !== method.toUpperCase()) return next();

        const match = pattern.exec(ctx.path);
        if (!match) return next();

        
        ctx.params = {};
        keys.forEach((k, i) => {
            ctx.params![k] = match[i + 1];
        });
        await handler(ctx);
    }, prefix);
}
