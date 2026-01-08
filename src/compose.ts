import type { Middleware, Context, LayerMiddleware, App } from "./types";

export function compose(middleware: Middleware[]) {
    return async function (ctx: Context): Promise<void> {
        let index = -1;

        async function dispatch(i: number): Promise<void> {
            if (i <= index) {
                throw new Error("next() called multiple times");
            }
            index = i;

            const fn = middleware[i];
            if (!fn) return;

            await fn(ctx, () => dispatch(i + 1));
        }

        await dispatch(0);
    };
}



export async function dispatch(app: App, ctx: Context): Promise<void> {
    const chain: Middleware[] = [];

    for (const entry of app.stack) {
        if (ctx.body !== undefined) break;

        if (entry.type === "middleware") {
            const mw = entry.item as LayerMiddleware;
            if (ctx.path.startsWith(mw.prefix)) {
                chain.push(mw.fn);
            }
        } else if (entry.type === "child") {
            const child = entry.item as App;
            if (ctx.path.startsWith(child.prefix)) {
                chain.push(async (ctx, next) => {
                    await dispatch(child, ctx);

                    if (ctx.body === undefined) await next();
                });

                if (ctx.body !== undefined) break;
            }
        }
    }

    if (chain.length > 0) {
        const fn = compose(chain);
        await fn(ctx);
    }
}
