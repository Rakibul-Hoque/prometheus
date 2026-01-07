export async function notFound(ctx) {
    if (ctx.body === undefined) {
        ctx.status = 404;
        ctx.body = { error: "Not Found" };
    }
}
