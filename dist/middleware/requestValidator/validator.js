"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestValidator = requestValidator;
const SchemaCompiler_1 = require("./SchemaCompiler");
function requestValidator(schema, options = {}) {
    const validate = SchemaCompiler_1.SchemaCompiler.compile(schema, options);
    return async (ctx, next) => {
        const result = validate(ctx.request.body, ctx.params, ctx.query);
        if (!result.valid) {
            ctx.status = 400;
            ctx.send({
                error: "Request validation failed",
                errors: result.errors
            });
            return;
        }
        ctx.request.body = result.data.body;
        ctx.params = result.data.params;
        ctx.query = result.data.query;
        await next();
    };
}
