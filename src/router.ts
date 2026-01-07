import type { App, Route, Next, Context, Handler } from "./types";

function parsePath(path: string): { pattern: RegExp; keys: string[] } {
    const keys: string[] = [];

    const pattern = path.replace(/:([^\/]+)/g, (_, key) => {
        keys.push(key);
        return "([^/]+)";
    });

    return {
        pattern: new RegExp("^" + pattern + "$"),
        keys
    };
}

function matchRoute(app: App, ctx: Context): Route | undefined {
    for (const route of app.routes) {
        const match = route.path.includes(":")
            ? route.pattern.exec(ctx.path)
            : ctx.path === route.path
            ? [""]
            : null;

        if (match && ctx.method.toUpperCase() === route.method) {
            ctx.params = {};
            if (route.keys && match.length > 1) {
                route.keys.forEach((key, i) => {
                    ctx.params![key] = match[i + 1];
                });
            }
            return route;
        }
    }

    for (const child of app.children) {
        const found = matchRoute(child, ctx);
        if (found) return found;
    }
}
export function addRoute(
    method: string,
    path: string,
    handler: Handler,
    app: App
) {
    const fullPath = app.prefix + path;
    const { pattern, keys } = parsePath(fullPath);

    app.routes.push({
        method: method.toUpperCase(),
        path: fullPath,
        handler,
        scope: app,
        keys,
        pattern
    });
}

export async function routerMiddleware(ctx: Context, next: Next) {
    const route = matchRoute(ctx.app, ctx);

    if (!route) return next();

    await route.handler(ctx);
}

