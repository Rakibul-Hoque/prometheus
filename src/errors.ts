import type { Context, Next } from "./types";

export async function defaultOnErrorHandler(ctx: Context, err: Error) {
    ctx.status = err.status || 500;
    const expose = err.expose;
    ctx.body = {
        error: expose ? err.message : "Internal Server Error",
        status: ctx.status
    };
}

export async function defaultOnNotFoundHandler(ctx: Context) {
    ctx.status = 404;
    ctx.body = {
        error: `Route ${ctx.method} ${ctx.path} not found`,
        status: 404
    };
}
