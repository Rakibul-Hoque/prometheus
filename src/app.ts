import http from "http";
import type {
    Middleware,
    LayerMiddleware,
    Plugin,
    Handler,
    Context,
    ErrorHandler,
    NotFoundHandler,
    StackType
} from "./types";
import { App as BaseApp } from "./types";
import { baseContextPrototype } from "./context/baseContext";
import { createContext } from "./context/createContext";
import { compile, compileApp, compose } from "./compose";

import { respond } from "./respond";
import type { AppOptions } from "./config";
import { defaultOptions, installSystem } from "./config";
import { router } from "./radix_router";

export class App extends BaseApp {
    parent: App | null = null;
    stack: StackType = [];

    _decorators = new Map<string, any>();
    _contextDecorators = new Map<string, any>();
    systemPre: Middleware[] = [];
    systemPost: Middleware[] = [];
    prefix: string = "";
    options: Required<AppOptions>;

    constructor(options: AppOptions = {}) {
        super();

        this.options = { ...defaultOptions, ...options };
        installSystem(this, this.options);
    }

    use(fn: Middleware | Middleware[], prefix: string = "") {
        const list = Array.isArray(fn) ? fn : [fn];
        for (const middleware of list) {
            const layer = {
                fn: middleware,
                prefix: this.prefix + prefix
            };

            this.stack.push({ type: "middleware", item: layer });
        }
    }

    register<T>(plugin: Plugin<T>, opts?: T) {
        const prefix = this.prefix + (opts?.prefix ?? "");
        const child = new App(this.options);
        child.parent = this;
        child.prefix = prefix;

        this._inheritDecoratorsToChild(child);
        this.stack.push({ type: "child", item: child });
        plugin(child, opts || ({} as T));
    }

    private _inheritDecoratorsToChild(child: App) {
        let parent: App | null = this;
        while (parent) {
            for (const [name] of parent._decorators) {
                if (!(name in child)) {
                    child._defineDecoratorProperty(name);
                }
            }
            parent = parent.parent;
        }
    }

    get(path: string, handler: Handler) {
        this.add("GET", path, handler);
        return this;
    }

    post(path: string, handler: Handler) {
        this.add("POST", path, handler);
        return this;
    }

    put(path: string, handler: Handler) {
        this.add("PUT", path, handler);
        return this;
    }

    delete(path: string, handler: Handler) {
        this.add("DELETE", path, handler);
        return this;
    }
    add(method, path, handler) {
        const fullPath = this.prefix + path;
        router.add(method, fullPath, handler);
        this.stack.push({
            type: "route" as const,
            item: { method, path: fullPath, handler }
        });
    }
    decorate(name: string, value: any) {
        if (this._decorators.has(name)) {
            throw new Error(
                `Decorator '${name}' already exists on this app instance`
            );
        }
        let current = this.parent;
        while (current) {
            if (current._decorators.has(name)) {
                throw new Error(
                    `Decorator '${name}' already exists in parent scope`
                );
            }
            current = current.parent;
        }
        this._decorators.set(name, value);
        this._defineDecoratorProperty(name);
    }

    private _defineDecoratorProperty(name: string) {
        const self = this;
        Object.defineProperty(this, name, {
            get() {
                let app: App | null = self;
                while (app) {
                    if (app._decorators.has(name)) {
                        return app._decorators.get(name);
                    }
                    app = app.parent;
                }
                return undefined;
            },
            enumerable: true,
            configurable: false
        });
    }

    decorateContext(name: string, value: any) {
        if (this._contextDecorators.has(name)) {
            throw new Error(
                `Context decorator '${name}' already exists in this app`
            );
        }
        this._contextDecorators.set(name, value);
        if (!(name in baseContextPrototype)) {
            Object.defineProperty(baseContextPrototype, name, {
                get() {
                    const currentApp = this.currentApp;
                    if (!currentApp) return undefined;

                    let app: App | null = currentApp;
                    while (app) {
                        if (app._contextDecorators.has(name)) {
                            return app._contextDecorators.get(name);
                        }
                        app = app.parent;
                    }
                    return undefined;
                },
                enumerable: true,
                configurable: true
            });
        }
    }
    listen(port: number) {
        const appMiddleware = compile(this);
        const requestMiddleware = compose([
            ...this.systemPre,
            appMiddleware,
            ...this.systemPost
        ]);

        const server = http.createServer(async (req, res) => {
            const ctx = await createContext(req, res, this);
            try {
                await requestMiddleware(ctx);
            } finally {
                await respond(ctx);
            }
        });

        server.listen(port);
    }

    listen2(port: number) {
        const server = http.createServer(async (req, res) => {
            const ctx = await createContext(req, res, this);

            try {
                const fn = compose([
                    ...this.systemPre,
                    async (ctx, next) => {
                        await dispatch(this, ctx);
                        if (ctx.body === undefined) {
                            await next();
                        }
                    },
                    ...this.systemPost
                ]);
                await fn(ctx);
            } finally {
                await respond(ctx);
            }
        });

        server.listen(port);
    }
}
