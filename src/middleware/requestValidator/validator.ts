import type { Middleware } from "../types";
import type { RequestSchema, RequestValidatorOptions } from "./types";
import { SchemaCompiler } from "./SchemaCompiler";

export function requestValidator(
    schema: RequestSchema,
    options: RequestValidatorOptions = {}
): Middleware {
    const validate = SchemaCompiler.compile(schema, options);

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
