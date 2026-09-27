export type SchemaType =
    | "string"
    | "number"
    | "integer"
    | "boolean"
    | "array"
    | "object"
    | "date"
    | "null";

export type ValidationSource = "body" | "params" | "query";

export interface ValidationError {
    source: ValidationSource;
    field: string;
    message: string;
    rule: string;
}

export interface ValidationResult {
    valid: boolean;

    data: {
        body: unknown;
        params: Record<string, string | number>,
        query: Record<string, string | number | number[] | string[]>
    };

    errors: ValidationError[];
}

export type CustomValidator<T = unknown> = (
    value: T,
    data: Record<string, unknown>
) => boolean | string;

export interface SchemaMessages {
    required?: string;
    type?: string;
    enum?: string;
    min?: string;
    max?: string;
    minLength?: string;
    maxLength?: string;
    pattern?: string;
    items?: string;
    validate?: string;
}

export interface ValidateRule<T = unknown> {
    validator: CustomValidator<T>;
    message?: string;
}

export interface SchemaField {
    type?: SchemaType;

    required?: boolean | ((data: Record<string, unknown>) => boolean);

    default?: unknown | ((data: Record<string, unknown>) => unknown);

    enum?: readonly unknown[];

    min?: number;
    max?: number;

    minLength?: number;
    maxLength?: number;

    pattern?: string | RegExp;

    items?: SchemaField;

    schema?: Schema;

    validate?: ValidateRule;

    message?: SchemaMessages;
}

export interface Schema {
    [field: string]: SchemaField;
}

export interface RequestSchema {
    body?: Schema;
    params?: Schema;
    query?: Schema;
}

export interface CompiledValidator {
    (
        body: unknown,
        params: Record<string, string | number>,
        query: Record<string, string | number | number[] | string[]>
    ): ValidationResult;
}

export interface RequestValidatorOptions {
    filter?: {
        body?: boolean;
        params?: boolean;
        query?: boolean;
    };

    // Future options can be added here.
    // Example:
    // abortEarly?: boolean;
    // stripUnknown?: boolean;
}
