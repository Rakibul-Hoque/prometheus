import type { Middleware, Context, LayerMiddleware } from "./types";

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

export async function dispatch(app: App, ctx: Context) {
    let index = -1;

    async function runMiddlewares(mws: LayerMiddleware[]) {
        index++;
        if (index >= mws.length) return;

        const mw = mws[index];
        if (!ctx.path.startsWith(mw.prefix)) {
            return runMiddlewares(mws);
        }

        await mw.fn(ctx, async () => runMiddlewares(mws));
    }

    await runMiddlewares(app.middlewares);

    for (const child of app.children) {
        if (ctx.path.startsWith(child.prefix)) {
            await dispatch(child, ctx);
            if (ctx.body !== undefined) return;
        }
    }
}

