"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultOnErrorHandler = defaultOnErrorHandler;
exports.defaultOnNotFoundHandler = defaultOnNotFoundHandler;
async function defaultOnErrorHandler(ctx, err) {
    ctx.send({
        error: err.expose ? err.message : "Internal Server Error",
        status: ctx.status
    }, err.status || 500, "json");
}
async function defaultOnNotFoundHandler(ctx) {
    ctx.send({
        error: `Route ${ctx.method} ${ctx.path} not found`,
        status: 404
    }, 404);
}
