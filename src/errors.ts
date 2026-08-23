import type { Context, Next } from "./types";

export async function defaultOnErrorHandler(ctx: Context, err: Error) {
    ctx.send(
        {
            error: err.expose ? err.message : "Internal Server Error",
            status: ctx.status
        },
        err.status || 500,
        "json"
    );
}

export async function defaultOnNotFoundHandler(ctx: Context) {
    
    
    
    ctx.send ( {
        error: `Route ${ctx.method} ${ctx.path} not found`,
        status: 404
    },404)
}
