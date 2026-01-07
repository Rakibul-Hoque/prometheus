import type { Middleware, Context } from "./types";

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
