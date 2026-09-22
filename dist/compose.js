"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compose = compose;
exports.compileApp = compileApp;
exports.compile = compile;
function compose(middleware) {
    return async function composed(ctx, next) {
        let index = -1;
        const dispatch = async (i) => {
            if (i <= index)
                throw new Error("next() called multiple times");
            index = i;
            if (i === middleware.length) {
                if (next)
                    await next();
                return;
            }
            const fn = middleware[i];
            if (!fn)
                return;
            await fn(ctx, () => dispatch(i + 1));
        };
        await dispatch(0);
    };
}
const matchesPrefix = (path, prefix) => {
    if (prefix === "/" || prefix === "")
        return true;
    return (path === prefix ||
        path.startsWith(prefix.endsWith("/") ? prefix : prefix + "/"));
};
function compileRoute(route) {
    if (route.execute) {
        return;
    }
    route.execute = compose([
        ...route.middleware,
        async (ctx) => {
            await route.handler(ctx);
        }
    ]);
}
function compileApp(app) {
    const chain = [];
    let pendingRoutes = [];
    const flushRoutes = () => {
        if (pendingRoutes.length === 0)
            return;
        const routes = pendingRoutes;
        for (const route of routes) {
            compileRoute(route);
        }
        const routeSet = new Set(routes);
        chain.push(async (ctx, next) => {
            if (ctx.responded)
                return;
            const result = app.router.find(ctx.method, ctx.path);
            if (!result) {
                await next();
                return;
            }
            if (!routeSet.has(result.route)) {
                await next();
                return;
            }
            ctx.params = result.params;
            ctx._execState._isRouteFound___ = true;
            await result.route.execute(ctx);
        });
        pendingRoutes = [];
    };
    for (const entry of app.stack) {
        switch (entry.type) {
            case "route": {
                pendingRoutes.push(entry.item);
                break;
            }
            case "middleware": {
                flushRoutes();
                const mw = entry.item;
                chain.push(async (ctx, next) => {
                    if (!matchesPrefix(ctx.path, mw.prefix)) {
                        await next();
                        return;
                    }
                    await mw.fn(ctx, next);
                });
                break;
            }
            case "child": {
                flushRoutes();
                const child = entry.item;
                const childFn = compileApp(child);
                chain.push(async (ctx, next) => {
                    if (!matchesPrefix(ctx.path, child.prefix)) {
                        await next();
                        return;
                    }
                    ctx.appStack.push(child);
                    try {
                        await childFn(ctx);
                    }
                    catch (err) {
                        if (err instanceof Error) {
                            const error = err;
                            error.app ??= child;
                        }
                        throw err;
                    }
                    finally {
                        ctx.appStack.pop();
                    }
                    if (!ctx.responded) {
                        await next();
                    }
                });
                break;
            }
        }
    }
    flushRoutes();
    return compose(chain);
}
function compile(app) {
    const appFn = compileApp(app);
    return async (ctx, next) => {
        ctx.appStack.push(app);
        try {
            await appFn(ctx);
        }
        catch (err) {
            if (err instanceof Error) {
                const error = err;
                error.app ??= app;
            }
            throw err;
        }
        finally {
            ctx.appStack.pop();
        }
        if (!ctx.responded) {
            await next();
        }
    };
}
