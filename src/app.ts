import type {
    Middleware,
    Plugin,
    Handler,
    RequestHandler,
    StackType,
    Route,
    LayerMiddleware
} from "./types";
import type { AppOptions, ResolvedAppOptions } from "./types";

import { EventEmitter } from "./events";
import { baseContextPrototype } from "./context/baseContext";
import { createContext } from "./context/createContext";
import { compile, compose } from "./compose";
import { finalParser } from "./final-parser";
import { defaultOptions, installSystem } from "./config";
import { RadixRouter } from "./radix_router";
import { joinPaths } from "./util";
import { createNodeServer } from "./adepter";

export class App extends EventEmitter {
    parent: App | null = null;
    _handler: RequestHandler | null = null;
    stack: StackType = [];
    router: RadixRouter = new RadixRouter();
    _decorators = new Map<string, any>();
    _contextDecorators = new Map<string, any>();
    systemPre: Middleware[] = [];
    systemPost: Middleware[] = [];
    prefix: string = "";
    options: ResolvedAppOptions;
    private _started = false;

    constructor(options: AppOptions = {}) {
        super();
        this.options = { ...defaultOptions, ...options };
        installSystem(this, this.options);
    }

    use(fn: Middleware | Middleware[], prefix: string = "") {
        this._assertMutable();

        const list = Array.isArray(fn) ? fn : [fn];
        for (const middleware of list) {
            const layer: LayerMiddleware = {
                fn: middleware,
                prefix: this.prefix + prefix
            };
            this.stack.push({ type: "middleware", item: layer });
        }
    }

    register<T = any>(plugin: Plugin<T>, opts?: T | { prefix?: string }): this {
        this._assertMutable();

        const prefix =
            typeof opts === "string"
                ? opts
                : ((opts as { prefix?: string } | undefined)?.prefix ?? "");

        const childPrefix = joinPaths(this.prefix, prefix);

        const child = new App(this.options);
        child.parent = this;
        child.prefix = childPrefix;

        this._inheritDecoratorsToChild(child);

        this.stack.push({ type: "child", item: child });

        plugin(child, (opts ?? ({} as T)) as T);
        return this;
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

    get(path: string, ...handlers: (Middleware | Handler)[]) {
        return this.add("GET", path, handlers);
    }

    post(path: string, ...handlers: (Middleware | Handler)[]) {
        return this.add("POST", path, handlers);
    }

    put(path: string, ...handlers: (Middleware | Handler)[]) {
        return this.add("PUT", path, handlers);
    }

    delete(path: string, ...handlers: (Middleware | Handler)[]) {
        return this.add("DELETE", path, handlers);
    }

    private add(
        method: string,
        path: string,
        handlers: (Middleware | Handler)[]
    ): this {
        this._assertMutable();
        if (handlers.length === 0) {
            throw new Error(`${method} ${path}: route requires a handler`);
        }
        const handler = handlers[handlers.length - 1] as Handler;
        const middleware = handlers.slice(0, -1) as Middleware[];

        const fullPath = joinPaths(this.prefix, path);

        const route: Route = {
            method: method.toUpperCase(),
            path: fullPath,
            middleware,
            handler,
            paramNames: []
        };
        this.router.add(route);
        this.stack.push({ type: "route", item: route });
        return this;
    }

    decorate(name: string, value: any) {
        this._assertMutable();
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
        this._assertMutable();

        if (this._contextDecorators.has(name)) {
            throw new Error(
                `Context decorator '${name}' already exists in this app`
            );
        }
        this._contextDecorators.set(name, value);
        if (!(name in baseContextPrototype)) {
            Object.defineProperty(baseContextPrototype, name, {
                get() {
                    const currentApp = (this as any).currentApp as App | null;
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

    private _assertMutable() {
        if (this._started) {
            throw new Error(
                "Cannot modify an application after handler is created  Error: handler()"
            );
        }
    }

    handler(): RequestHandler {
        if (this._handler) return this._handler;
        this._started = true;

        const appMiddleware = compile(this);

        const requestMiddleware = compose([
            ...this.systemPre,
            appMiddleware,
            ...this.systemPost
        ]);

        this._handler = async reqCtx => {
            const ctx = await createContext(reqCtx, this);
            await requestMiddleware(ctx);
            await finalParser(ctx);
            return ctx;
        };

        return this._handler;
    }

    listen(port: number, callback?: () => void) {
        return createNodeServer(this, port, callback);
    }
}
