export  async function notFound(ctx) {
    if (ctx.body == null) {
        ctx.status = 404;
        ctx.body = { error: "Not Found" };
    }
}
