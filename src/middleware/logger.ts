import type  { Context,Next } from "../types";

export async function logger(ctx: Context, next:Next)  {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;

    console.log(`${ctx.method} ${ctx.path} ${ctx.res.statusCode} - ${ms}ms`);
}
