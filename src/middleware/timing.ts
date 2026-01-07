import type { Context, Next } from "../types";

export async function timing(ctx:const, next:Next) {
    const start = process.hrtime.bigint();
    await next();
    const end = process.hrtime.bigint();

    const ms = Number(end - start) / 1e6;
    ctx.set("X-Response-Time", ms.toFixed(2) + "ms");
}
