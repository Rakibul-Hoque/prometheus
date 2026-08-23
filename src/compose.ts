import type {
    Middleware,
    Context,
    LayerMiddleware,
    App,
    Handler
} from "./types";

import { router } from "./radix_router";

export function compose(middleware: readonly Middleware[]): Middleware {
    return async function composed(ctx: Context): Promise<void> {
        let index = -1;
        const dispatch = async (i: number): Promise<void> => {
            if (i <= index) throw new Error("next() called multiple times");
            index = i;
            const fn = middleware[i];
            if (!fn) return;
            await fn(ctx, () => dispatch(i + 1));
        };
        await dispatch(0);
    };
}

const matchesPrefix = (path: string, prefix: string): boolean => {
    if (prefix === "/" || prefix === "") return true;
    return (
        path === prefix ||
        path.startsWith(prefix.endsWith("/") ? prefix : prefix + "/")
    );
};

export function compileApp(app: App): Middleware {
    const chain: Middleware[] = [];

    let pendingRoutes: Array<{
        method: string;
        path: string;
        handler: Handler;
    }> = [];

    const flushRoutes = () => {
        if (pendingRoutes.length === 0) {
            return;
        }
        const handlers = new Set(pendingRoutes.map(route => route.handler));

        const methods = new Set(pendingRoutes.map(route => route.method));

        chain.push(async (ctx, next) => {
            if (ctx.body !== undefined) return;
            if (!methods.has(ctx.method)) {
                await next();
                return;
            }
            const result = router.find(ctx.method, ctx.path);

            if (result !== undefined && handlers.has(result.handler)) {
                ctx.params = result.params;
                await result.handler(ctx);
                return;
            }
            await next();
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

                const mw = entry.item as LayerMiddleware;

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
                    } catch (err) {
                        if (err instanceof Error) {
                            const error = err as Error & { app?: App };
                            error.app ??= child;
                        }
                        
                        throw err;
                    } finally {
                        ctx.appStack.pop();
                    }

                    if (ctx.body === undefined) {
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

export function compile(app: App): Middleware {
    const appFn = compileApp(app);

    return async (ctx, next) => {
        ctx.appStack.push(app);
        try {
            await appFn(ctx);
        } catch (err) {
            if (err instanceof Error) {
                const error = err as Error & { app?: App };
                error.app ??= app;
            }

            throw err;
        } finally {
            ctx.appStack.pop();
        }

        if (ctx.body === undefined) {
            await next();
        }
    };
}
