import type {
    CompiledValidator,
    RequestSchema,
    Schema,
    SchemaField,
    ValidationSource,
    RequestValidatorOptions
} from "./types";

interface Runtime {
    cast(
        value: unknown,
        type: string | undefined,
        shouldCast: boolean
    ): unknown;

    isType(value: unknown, type: string): boolean;

    makeError(
        source: ValidationSource,
        field: string,
        message: string,
        rule: string
    ): {
        source: ValidationSource;
        field: string;
        message: string;
        rule: string;
    };

    regex(pattern: string): RegExp;

    runCustom(
        validator: Function,
        value: unknown,
        data: Record<string, unknown>
    ): boolean | string;
}

const runtime: Runtime = {
    cast(value, type, shouldCast) {
        if (value === undefined || value === null) return value;

        if (type === "date") {
            if (value instanceof Date) return value;
            if (typeof value !== "string") return value;
            if (value.trim() === "") return value;
            const date = new Date(value);
            if (!Number.isNaN(date.getTime())) return date;
            return value;
        }
        if (!shouldCast) return value;

        switch (type) {
            case "string":
                return typeof value === "string" ? value : String(value);
            case "number": {
                if (typeof value === "number") return value;
                if (typeof value !== "string") return value;
                if (value.trim() === "") return value;
                const result = Number(value);
                return Number.isFinite(result) ? result : value;
            }
            case "integer": {
                if (typeof value === "number") return value;
                if (typeof value !== "string") return value;
                if (value.trim() === "") return value;
                const result = Number(value);
                return Number.isInteger(result) ? result : value;
            }
            case "boolean": {
                if (typeof value === "boolean") return value;
                if (typeof value !== "string") return value;
                const normalized = value.trim().toLowerCase();
                if (normalized === "true" || normalized === "1") return true;
                if (normalized === "false" || normalized === "0") return false;
                return value;
            }
            case "array": {
                if (Array.isArray(value)) return value;
                return [value];
            }
            default:
                return value;
        }
    },

    isType(value, type) {
        switch (type) {
            case "string":
                return typeof value === "string";
            case "number":
                return typeof value === "number" && Number.isFinite(value);
            case "integer":
                return typeof value === "number" && Number.isInteger(value);
            case "boolean":
                return typeof value === "boolean";
            case "array":
                return Array.isArray(value);
            case "object":
                return (
                    typeof value === "object" &&
                    value !== null &&
                    !Array.isArray(value)
                );
            case "date":
                return value instanceof Date && !Number.isNaN(value.getTime());
            case "null":
                return value === null;
            default:
                return false;
        }
    },

    makeError(source, field, message, rule) {
        return {
            source,
            field,
            message,
            rule
        };
    },

    regex(pattern) {
        return new RegExp(pattern);
    },

    runCustom(validator, value, data) {
        return validator(value, data);
    }
};

export class SchemaCompiler {
    static compile(
        schema: RequestSchema,
        options: RequestValidatorOptions = {}
    ): CompiledValidator {
        this.checkSchema(schema);

        /*
         * Filtering is enabled by default.
         */
        const filter = {
            body: options.filter?.body ?? true,
            params: options.filter?.params ?? true,
            query: options.filter?.query ?? true
        };

        const bodyFilterCode =
            schema.body && filter.body
                ? this.compileFilter(schema.body, "body")
                : "";

        const paramsFilterCode =
            schema.params && filter.params
                ? this.compileFilter(schema.params, "params")
                : "";

        const queryFilterCode =
            schema.query && filter.query
                ? this.compileFilter(schema.query, "query")
                : "";

        const bodyCode = schema.body
            ? this.compileSchema(schema.body, "body", false)
            : "";

        const paramsCode = schema.params
            ? this.compileSchema(schema.params, "params", true)
            : "";

        const queryCode = schema.query
            ? this.compileSchema(schema.query, "query", true)
            : "";

        const source = `
            return function validate(
                body,
                params,
                query
            ) {

                const errors = [];

                /*
                 * Normalize input containers.
                 *
                 * We only normalize the three request sections
                 * themselves. Nothing else is touched.
                 */

                if (
                    body === null ||
                    typeof body !== "object" ||
                    Array.isArray(body)
                ) {
                    body = {};
                }

                if (
                    params === null ||
                    typeof params !== "object" ||
                    Array.isArray(params)
                ) {
                    params = {};
                }

                if (
                    query === null ||
                    typeof query !== "object" ||
                    Array.isArray(query)
                ) {
                    query = {};
                }

                /*
                 * Filter unknown fields first.
                 */
                ${bodyFilterCode}

                ${paramsFilterCode}

                ${queryFilterCode}

                /*
                 * Then validate.
                 */
                ${bodyCode}

                ${paramsCode}

                ${queryCode}

                return {
                    valid: errors.length === 0,

                    data: {
                        body,
                        params,
                        query
                    },

                    errors
                };
            }
        `;

        return new Function("runtime", source)(runtime);
    }

    private static compileFilter(
        schema: Schema,
        root: "body" | "params" | "query"
    ): string {
        const allowedFields = Object.keys(schema);

        let code = "";

        code += `
            {
                const allowed = ${JSON.stringify(allowedFields)};

                for (
                    const key of Object.keys(${root})
                ) {
                    if (!allowed.includes(key)) {
                        delete ${root}[key];
                    }
                }
            }
        `;

        for (const [field, rules] of Object.entries(schema)) {
            if (!rules.schema && !rules.items) {
                continue;
            }

            const value = `${root}[${JSON.stringify(field)}]`;

            code += this.compileFilterNested(rules, value);
        }

        return code;
    }

    private static compileFilterNested(
        rules: SchemaField,
        value: string
    ): string {
        let code = "";

        /*
         * Nested object
         */
        if (rules.schema) {
            const allowedFields = Object.keys(rules.schema);

            code += `
                if (
                    ${value} !== null &&
                    typeof ${value} === "object" &&
                    !Array.isArray(${value})
                ) {

                    {
                        const allowed = ${JSON.stringify(allowedFields)};

                        for (
                            const key of Object.keys(${value})
                        ) {
                            if (!allowed.includes(key)) {
                                delete ${value}[key];
                            }
                        }
                    }
            `;

            for (const [childField, childRules] of Object.entries(
                rules.schema
            )) {
                if (!childRules.schema && !childRules.items) {
                    continue;
                }

                const childValue = `${value}[${JSON.stringify(childField)}]`;

                code += this.compileFilterNested(childRules, childValue);
            }

            code += `
                }
            `;
        }

        /*
         * Array
         */
        if (rules.items) {
            code += `
                if (Array.isArray(${value})) {
                    for (
                        let i = 0;
                        i < ${value}.length;
                        i++
                    ) {
            `;

            code += this.compileFilterNested(rules.items, `${value}[i]`);

            code += `
                    }
                }
            `;
        }

        return code;
    }

    private static compileSchema(
        schema: Schema,
        source: ValidationSource,
        cast: boolean
    ): string {
        let code = "";

        for (const [field, rules] of Object.entries(schema)) {
            code += this.compileField(
                source,
                field,
                field,
                rules,
                cast,
                source
            );
        }

        return code;
    }

    private static compileField(
        source: ValidationSource,
        field: string,
        path: string,
        rules: SchemaField,
        cast: boolean,
        dataName: string
    ): string {
        const root =
            source === "body"
                ? "body"
                : source === "params"
                  ? "params"
                  : "query";

        const value = `${root}[${JSON.stringify(field)}]`;

        const message = rules.message ?? {};

        let code = "";

        /*
         * Default
         */
        if (rules.default !== undefined) {
            let defaultExpression: string;

            if (typeof rules.default === "function") {
                defaultExpression = `(${rules.default.toString()})(${root})`;
            } else {
                defaultExpression = JSON.stringify(rules.default);
            }

            code += `
                if (${value} === undefined) {
                    ${value} = ${defaultExpression};
                }
            `;
        }

        if (rules.type) {
            code += `
                if (${value} !== undefined) {
                    ${value} = runtime.cast(
                        ${value},
                        ${JSON.stringify(rules.type)},
                        ${cast}
                    );
                }
            `;
        }

        /*
         * Required
         */
        let requiredExpression = "false";

        if (typeof rules.required === "function") {
            requiredExpression = `(${rules.required.toString()})(${root})`;
        } else if (rules.required === true) {
            requiredExpression = "true";
        }

        code += `
            if (
                ${requiredExpression} &&
                ${value} === undefined
            ) {
                errors.push(
                    runtime.makeError(
                        ${JSON.stringify(source)},
                        ${JSON.stringify(path)},
                        ${JSON.stringify(
                            message.required ??
                                `${this.humanize(field)} is required`
                        )},
                        "required"
                    )
                );
            }
        `;

        /*
         * Existing value
         */
        code += `
            if (${value} !== undefined) {
        `;

        if (rules.type) {
            code += `
                if (
                    !runtime.isType(
                        ${value},
                        ${JSON.stringify(rules.type)}
                    )
                ) {
                    errors.push(
                        runtime.makeError(
                            ${JSON.stringify(source)},
                            ${JSON.stringify(path)},
                            ${JSON.stringify(
                                message.type ??
                                    this.defaultTypeMessage(field, rules.type)
                            )},
                            "type"
                        )
                    );
                } else {
            `;

            code += this.compileConstraints(
                source,
                field,
                path,
                value,
                rules,
                message,
                root
            );

            code += `
                }
            `;
        } else {
            code += this.compileConstraints(
                source,
                field,
                path,
                value,
                rules,
                message,
                root
            );
        }

        code += `
            }
        `;

        return code;
    }

    private static compileConstraints(
        source: ValidationSource,
        field: string,
        path: string,
        value: string,
        rules: SchemaField,
        message: NonNullable<SchemaField["message"]>,
        root: string
    ): string {
        let code = "";

        /*
         * Enum
         */
        if (rules.enum) {
            code += `
                if (
                    !${JSON.stringify(rules.enum)}.some(
                        allowed =>
                            Object.is(
                                allowed,
                                ${value}
                            )
                    )
                ) {
                    errors.push(
                        runtime.makeError(
                            ${JSON.stringify(source)},
                            ${JSON.stringify(path)},
                            ${JSON.stringify(
                                message.enum ??
                                    `${this.humanize(
                                        field
                                    )} has an invalid value`
                            )},
                            "enum"
                        )
                    );
                }
            `;
        }

        /*
         * minLength
         */
        if (rules.minLength !== undefined) {
            code += `
                if (
                    typeof ${value} === "string" &&
                    ${value}.length < ${rules.minLength}
                ) {
                    errors.push(
                        runtime.makeError(
                            ${JSON.stringify(source)},
                            ${JSON.stringify(path)},
                            ${JSON.stringify(
                                message.minLength ??
                                    `${this.humanize(
                                        field
                                    )} must contain at least ${rules.minLength} characters`
                            )},
                            "minLength"
                        )
                    );
                }
            `;
        }

        /*
         * maxLength
         */
        if (rules.maxLength !== undefined) {
            code += `
                if (
                    typeof ${value} === "string" &&
                    ${value}.length > ${rules.maxLength}
                ) {
                    errors.push(
                        runtime.makeError(
                            ${JSON.stringify(source)},
                            ${JSON.stringify(path)},
                            ${JSON.stringify(
                                message.maxLength ??
                                    `${this.humanize(
                                        field
                                    )} must contain at most ${rules.maxLength} characters`
                            )},
                            "maxLength"
                        )
                    );
                }
            `;
        }

        /*
         * Pattern
         */
        if (rules.pattern !== undefined) {
            const pattern =
                rules.pattern instanceof RegExp
                    ? rules.pattern.source
                    : rules.pattern;

            code += `
                if (
                    typeof ${value} === "string" &&
                    !runtime.regex(
                        ${JSON.stringify(pattern)}
                    ).test(${value})
                ) {
                    errors.push(
                        runtime.makeError(
                            ${JSON.stringify(source)},
                            ${JSON.stringify(path)},
                            ${JSON.stringify(
                                message.pattern ??
                                    `${this.humanize(
                                        field
                                    )} has an invalid format`
                            )},
                            "pattern"
                        )
                    );
                }
            `;
        }

        /*
         * min
         */
        if (rules.min !== undefined) {
            code += `
                if (
                    typeof ${value} === "number" &&
                    ${value} < ${rules.min}
                ) {
                    errors.push(
                        runtime.makeError(
                            ${JSON.stringify(source)},
                            ${JSON.stringify(path)},
                            ${JSON.stringify(
                                message.min ??
                                    `${this.humanize(
                                        field
                                    )} must be at least ${rules.min}`
                            )},
                            "min"
                        )
                    );
                }
            `;
        }

        /*
         * max
         */
        if (rules.max !== undefined) {
            code += `
                if (
                    typeof ${value} === "number" &&
                    ${value} > ${rules.max}
                ) {
                    errors.push(
                        runtime.makeError(
                            ${JSON.stringify(source)},
                            ${JSON.stringify(path)},
                            ${JSON.stringify(
                                message.max ??
                                    `${this.humanize(
                                        field
                                    )} must be at most ${rules.max}`
                            )},
                            "max"
                        )
                    );
                }
            `;
        }

        /*
         * Array items
         */
        if (rules.items) {
            code += `
                if (Array.isArray(${value})) {
                    for (
                        let i = 0;
                        i < ${value}.length;
                        i++
                    ) {
            `;

            code += this.compileNestedField(
                source,
                `${field}[i]`,
                `${path}[i]`,
                `${value}[i]`,
                rules.items,
                source === "params" || source === "query",
                root
            );

            code += `
                    }
                }
            `;
        }
        /*
         * Nested object
         */
        if (rules.schema) {
            code += `
                if (
                    typeof ${value} === "object" &&
                    ${value} !== null &&
                    !Array.isArray(${value})
                ) {
            `;

            for (const [childField, childRules] of Object.entries(
                rules.schema
            )) {
                code += this.compileNestedField(
                    source,
                    `${field}.${childField}`,
                    `${path}.${childField}`,
                    `${value}[${JSON.stringify(childField)}]`,
                    childRules,
                    source === "params" || source === "query",
                    value
                );
            }
            code += `
                }
            `;
        }

        /*
         * Custom validator
         */
        if (rules.validate) {
            const validator = rules.validate.validator.toString();

            const customMessage =
                rules.validate.message ??
                message.validate ??
                `${this.humanize(field)} is invalid`;

            code += `
                {
                    const result =
                        runtime.runCustom(
                            (${validator}),
                            ${value},
                            ${root}
                        );

                    if (result !== true) {
                        errors.push(
                            runtime.makeError(
                                ${JSON.stringify(source)},
                                ${JSON.stringify(path)},
                                typeof result === "string"
                                    ? result
                                    : ${JSON.stringify(customMessage)},
                                "validate"
                            )
                        );
                    }
                }
            `;
        }
        return code;
    }

    private static compileNestedField(
        source: ValidationSource,
        field: string,
        path: string,
        value: string,
        rules: SchemaField,
        cast: boolean,
        root: string
    ): string {
        const message = rules.message ?? {};

        let code = "";
        /*
         * Default
         */
        if (rules.default !== undefined) {
            let defaultExpression: string;

            if (typeof rules.default === "function") {
                defaultExpression = `(${rules.default.toString()})(${root})`;
            } else {
                defaultExpression = JSON.stringify(rules.default);
            }
            code += `
                if (${value} === undefined) {
                    ${value} = ${defaultExpression};
                }
            `;
        }

        /*
         * Type / casting
         */
        if (rules.type) {
            code += `
                if (${value} !== undefined) {
                    ${value} = runtime.cast(
                        ${value},
                        ${JSON.stringify(rules.type)},
                        ${cast}
                    );
                }
            `;

            code += `
                if (
                    ${value} !== undefined &&
                    !runtime.isType(
                        ${value},
                        ${JSON.stringify(rules.type)}
                    )
                ) {
                    errors.push(
                        runtime.makeError(
                            ${JSON.stringify(source)},
                            ${JSON.stringify(path)},
                            ${JSON.stringify(
                                message.type ??
                                    `${this.humanize(
                                        field
                                    )} must be ${rules.type}`
                            )},
                            "type"
                        )
                    );
                } else if (${value} !== undefined) {
            `;

            code += this.compileNestedConstraints(
                source,
                field,
                path,
                value,
                rules,
                message,
                cast,
                root
            );

            code += `
                }
            `;
        } else {
            code += `
                if (${value} !== undefined) {
            `;

            code += this.compileNestedConstraints(
                source,
                field,
                path,
                value,
                rules,
                message,
                cast,
                root
            );

            code += `
                }
            `;
        }

        /*
         * Required
         */
        const required =
            typeof rules.required === "function"
                ? `(${rules.required.toString()})(${root})`
                : rules.required === true
                  ? "true"
                  : "false";

        code += `
            if (
                ${required} &&
                ${value} === undefined
            ) {
                errors.push(
                    runtime.makeError(
                        ${JSON.stringify(source)},
                        ${JSON.stringify(path)},
                        ${JSON.stringify(
                            message.required ??
                                `${this.humanize(field)} is required`
                        )},
                        "required"
                    )
                );
            }
        `;
        return code;
    }

    private static compileNestedConstraints(
        source: ValidationSource,
        field: string,
        path: string,
        value: string,
        rules: SchemaField,
        message: NonNullable<SchemaField["message"]>,
        cast: boolean,
        root: string
    ): string {
        let code = "";

        /*
         * Enum
         */
        if (rules.enum) {
            code += `
                if (
                    !${JSON.stringify(rules.enum)}.some(
                        allowed =>
                            Object.is(
                                allowed,
                                ${value}
                            )
                    )
                ) {
                    errors.push(
                        runtime.makeError(
                            ${JSON.stringify(source)},
                            ${JSON.stringify(path)},
                            ${JSON.stringify(
                                message.enum ??
                                    `${this.humanize(
                                        field
                                    )} has an invalid value`
                            )},
                            "enum"
                        )
                    );
                }
            `;
        }

        /*
         * min
         */
        if (rules.min !== undefined) {
            code += `
                if (
                    typeof ${value} === "number" &&
                    ${value} < ${rules.min}
                ) {
                    errors.push(
                        runtime.makeError(
                            ${JSON.stringify(source)},
                            ${JSON.stringify(path)},
                            ${JSON.stringify(
                                message.min ??
                                    `${this.humanize(
                                        field
                                    )} must be at least ${rules.min}`
                            )},
                            "min"
                        )
                    );
                }
            `;
        }

        /*
         * max
         */
        if (rules.max !== undefined) {
            code += `
                if (
                    typeof ${value} === "number" &&
                    ${value} > ${rules.max}
                ) {
                    errors.push(
                        runtime.makeError(
                            ${JSON.stringify(source)},
                            ${JSON.stringify(path)},
                            ${JSON.stringify(
                                message.max ??
                                    `${this.humanize(
                                        field
                                    )} must be at most ${rules.max}`
                            )},
                            "max"
                        )
                    );
                }
            `;
        }

        /*
         * minLength
         */
        if (rules.minLength !== undefined) {
            code += `
                if (
                    typeof ${value} === "string" &&
                    ${value}.length <
                    ${rules.minLength}
                ) {
                    errors.push(
                        runtime.makeError(
                            ${JSON.stringify(source)},
                            ${JSON.stringify(path)},
                            ${JSON.stringify(
                                message.minLength ??
                                    `${this.humanize(
                                        field
                                    )} must contain at least ${rules.minLength} characters`
                            )},
                            "minLength"
                        )
                    );
                }
            `;
        }

        /*
         * maxLength
         */
        if (rules.maxLength !== undefined) {
            code += `
                if (
                    typeof ${value} === "string" &&
                    ${value}.length >
                    ${rules.maxLength}
                ) {
                    errors.push(
                        runtime.makeError(
                            ${JSON.stringify(source)},
                            ${JSON.stringify(path)},
                            ${JSON.stringify(
                                message.maxLength ??
                                    `${this.humanize(
                                        field
                                    )} must contain at most ${rules.maxLength} characters`
                            )},
                            "maxLength"
                        )
                    );
                }
            `;
        }

        /*
         * Pattern
         */
        if (rules.pattern !== undefined) {
            const pattern =
                rules.pattern instanceof RegExp
                    ? rules.pattern.source
                    : rules.pattern;

            code += `
                if (
                    typeof ${value} === "string" &&
                    !runtime.regex(
                        ${JSON.stringify(pattern)}
                    ).test(${value})
                ) {
                    errors.push(
                        runtime.makeError(
                            ${JSON.stringify(source)},
                            ${JSON.stringify(path)},
                            ${JSON.stringify(
                                message.pattern ??
                                    `${this.humanize(
                                        field
                                    )} has an invalid format`
                            )},
                            "pattern"
                        )
                    );
                }
            `;
        }

        /*
         * Custom validator
         */
        if (rules.validate) {
            const validator = rules.validate.validator.toString();

            const customMessage =
                rules.validate.message ??
                message.validate ??
                `${this.humanize(field)} is invalid`;

            code += `
                {
                    const result =
                        runtime.runCustom(
                            (${validator}),
                            ${value},
                            ${root}
                        );

                    if (result !== true) {
                        errors.push(
                            runtime.makeError(
                                ${JSON.stringify(source)},
                                ${JSON.stringify(path)},
                                typeof result === "string"
                                    ? result
                                    : ${JSON.stringify(customMessage)},
                                "validate"
                            )
                        );
                    }
                }
            `;
        }

        /*
         * Nested object
         */
        if (rules.schema) {
            for (const [childField, childRules] of Object.entries(
                rules.schema
            )) {
                code += this.compileNestedField(
                    source,
                    `${field}.${childField}`,
                    `${path}.${childField}`,
                    `${value}[${JSON.stringify(childField)}]`,
                    childRules,
                    cast,
                    value
                );
            }
        }

        /*
         * Array items
         */
        if (rules.items) {
            code += `
                if (Array.isArray(${value})) {
                    for (
                        let i = 0;
                        i < ${value}.length;
                        i++
                    ) {
            `;

            code += this.compileNestedField(
                source,
                `${field}[i]`,
                `${path}[i]`,
                `${value}[i]`,
                rules.items,
                cast,
                root
            );

            code += `
                    }
                }
            `;
        }

        return code;
    }

    private static checkSchema(schema: RequestSchema): void {
        for (const [source, fields] of Object.entries(schema)) {
            if (!fields) {
                continue;
            }

            this.checkFields(fields, source, source);
        }
    }

    private static checkFields(
        fields: Schema,
        source: string,
        path: string
    ): void {
        for (const [field, rules] of Object.entries(fields)) {
            const fieldPath = `${path}.${field}`;

            if (rules.minLength !== undefined && rules.min !== undefined) {
                throw new Error(
                    `${fieldPath}: cannot use both minLength and min`
                );
            }

            if (rules.maxLength !== undefined && rules.max !== undefined) {
                throw new Error(
                    `${fieldPath}: cannot use both maxLength and max`
                );
            }

            if (rules.items && rules.type !== "array") {
                throw new Error(
                    `${fieldPath}: items can only be used with array fields`
                );
            }

            if (rules.schema && rules.type !== "object") {
                throw new Error(
                    `${fieldPath}: schema can only be used with object fields`
                );
            }

            if (rules.pattern !== undefined && rules.type !== "string") {
                throw new Error(
                    `${fieldPath}: pattern can only be used with string fields`
                );
            }

            if (
                (rules.min !== undefined || rules.max !== undefined) &&
                rules.type !== "number" &&
                rules.type !== "integer"
            ) {
                throw new Error(
                    `${fieldPath}: min/max can only be used with number or integer fields`
                );
            }

            /*
             * Recursively validate nested schemas.
             */
            if (rules.schema) {
                this.checkFields(rules.schema, source, fieldPath);
            }

            /*
             * Validate array item rules.
             */
            if (rules.items) {
                this.checkField(rules.items, source, `${fieldPath}[i]`);
            }
        }
    }

    private static checkField(
        rules: SchemaField,
        source: string,
        fieldPath: string
    ): void {
        if (rules.minLength !== undefined && rules.min !== undefined) {
            throw new Error(`${fieldPath}: cannot use both minLength and min`);
        }

        if (rules.maxLength !== undefined && rules.max !== undefined) {
            throw new Error(`${fieldPath}: cannot use both maxLength and max`);
        }

        if (rules.items && rules.type !== "array") {
            throw new Error(
                `${fieldPath}: items can only be used with array fields`
            );
        }

        if (rules.schema && rules.type !== "object") {
            throw new Error(
                `${fieldPath}: schema can only be used with object fields`
            );
        }

        if (rules.pattern !== undefined && rules.type !== "string") {
            throw new Error(
                `${fieldPath}: pattern can only be used with string fields`
            );
        }

        if (
            (rules.min !== undefined || rules.max !== undefined) &&
            rules.type !== "number" &&
            rules.type !== "integer"
        ) {
            throw new Error(
                `${fieldPath}: min/max can only be used with number or integer fields`
            );
        }
        if (rules.schema) this.checkFields(rules.schema, source, fieldPath);
        if (rules.items)
            this.checkField(rules.items, source, `${fieldPath}[i]`);
    }

    private static humanize(field: string): string {
        const name = field
            .replace(/\[i\]/g, "")
            .replace(/\./g, " ")
            .replace(/[_-]/g, " ")
            .replace(/([a-z])([A-Z])/g, "$1 $2");

        return name.charAt(0).toUpperCase() + name.slice(1);
    }

    private static defaultTypeMessage(field: string, type: string): string {
        const name = this.humanize(field);

        switch (type) {
            case "string":
                return `${name} must be text`;
            case "number":
                return `${name} must be a number`;
            case "integer":
                return `${name} must be a whole number`;
            case "boolean":
                return `${name} must be true or false`;
            case "array":
                return `${name} must be a list`;
            case "object":
                return `${name} must be an object`;
            case "date":
                return `${name} must be a valid date`;
            case "null":
                return `${name} must be null`;
            default:
                return `${name} has an invalid value`;
        }
    }
}
