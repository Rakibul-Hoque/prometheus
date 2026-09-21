import type { Context, Next } from "../types";

export async function errorBoundary(ctx: Context, next: Next) {
try {
    await next();
  } catch (err: any) {
    ctx.status = err.status || 500;
    const app = err.app ?? ctx.rootApp

    try {
      await app.emit("error", ctx, err);
    } catch (handlerErr) {
      console.error("Error in on error handler:", handlerErr);

      ctx.send(
        err.expose
          ? { error: err.message }
          : { error: "Internal Server Error" },
        ctx.status ?? 500,
        ctx.type ?? "json"
      );
      return;
    }

    if (!ctx.responded) {
      ctx.send({ error: "Internal Server Error" }, ctx.status ?? 500);
    } 
  }  
}
