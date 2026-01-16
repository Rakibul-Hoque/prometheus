import type { Middleware, Context, LayerMiddleware, App } from "./types";
import { router } from "./radix_router";
export function compose(middleware: Middleware[]) {
    return async function (ctx: Context): Promise<void> {
        let index = -1;

        async function dispatch(i: number): Promise<void> {
            if (i <= index) {
                throw new Error("next() called multiple times");
            }
            index = i;
            if (ctx.body !== undefined) return;
            const fn = middleware[i];
            if (!fn) return;

            await fn(ctx, () => dispatch(i + 1));
        }

        await dispatch(0);
    };
}


export async function dispatch(app: App, ctx: Context): Promise<void> {
    const chain: Middleware[] = [];
    let pendingRoutes: Array<{
        method: string;
        path: string;
        handler: Handler;
    }> = [];

    const flushRoutes = () => {
        if (pendingRoutes.length > 0) {
            const pendingHandlers = new Set(pendingRoutes.map(r => r.handler));

            chain.push(async (ctx, next) => {
                if (ctx.body !== undefined) return next();

                const result = router.find(ctx.method, ctx.path);
                if (result && pendingHandlers.has(result.handler)) {
                    ctx.params = result.params;
                    await result.handler(ctx);
                } else await next();
            });
            pendingRoutes = [];
        }
    };

    ctx.appStack.push(app);
    try {
        for (const entry of app.stack) {
            if (ctx.body !== undefined) break;

            if (entry.type === "middleware") {
                flushRoutes();

                const mw = entry.item as LayerMiddleware;
                if (ctx.path.startsWith(mw.prefix)) chain.push(mw.fn);
            } else if (entry.type === "child") {
                flushRoutes();

                const child = entry.item as App;
                if (ctx.path.startsWith(child.prefix)) {
                    chain.push(async (ctx, next) => {
                        await dispatch(child, ctx);
                        if (ctx.body === undefined) await next();
                    });
                }
            } else if (entry.type === "route") pendingRoutes.push(entry.item);
        }

        flushRoutes();

        if (chain.length > 0) {
            const fn = compose(chain);
            await fn(ctx);
        }
    } catch (err) {
        if (!err.app) err.app = app;
        throw err;
    } finally {
        ctx.appStack.pop();
    }
}
