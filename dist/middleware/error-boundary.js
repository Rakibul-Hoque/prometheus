"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorBoundary = errorBoundary;
const CATCH = 1;
async function errorBoundary(ctx, next) {
    if (CATCH) {
        try {
            await next();
        }
        catch (err) {
            ctx.status = err.status || 500;
            const app = err.app ?? ctx.rootApp;
            try {
                await app.emit("error", ctx, err);
            }
            catch (handlerErr) {
                console.error("Error in on error handler:", handlerErr);
                ctx.send(err.expose
                    ? { error: err.message }
                    : { error: "Internal Server Error" }, ctx.status ?? 500, ctx.type ?? "json");
                return;
            }
            if (!ctx.responded) {
                ctx.send({ error: "Internal Server Error" }, ctx.status ?? 500);
            }
        }
    }
    else
        await next();
}
