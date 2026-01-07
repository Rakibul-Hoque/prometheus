import type { Context, Route, Middleware } from "./types";
import { App } from "./types";

export function parsePath(path: string): { pattern: RegExp; keys: string[] } {
    const keys: string[] = [];
    const patternStr = path.replace(/:([^\/]+)/g, (_, key) => {
        keys.push(key);
        return "([^/]+)";
    });

    return {
        pattern: new RegExp("^" + patternStr + "$"),
        keys
    };
}

export function matchRoute(app: App, ctx: Context): Route | undefined {
    for (const route of app.routes) {
        const match = route.path.includes(":")
            ? route.pattern.exec(ctx.path)
            : ctx.path === route.path
            ? [""] // dummy to match
            : null;

        if (match && ctx.method.toUpperCase() === route.method) {
            // dynamic params
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

export async function routerMiddleware(ctx, next) {
    const route = matchRoute(ctx.app, ctx);

    if (!route) return next();

    ctx.params = route.params;
    ctx._matchedRoute = route;

    await route.handler(ctx);
}
