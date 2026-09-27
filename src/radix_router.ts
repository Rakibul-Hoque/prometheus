import type { Route, RouteMatch, RadixNode } from "./types";

export class RadixRouter {
    private root: RadixNode;
    private cache: Map<string, RouteMatch>;

    private staticRoutes: Map<string, Map<string, Route>>;
    private prefixCache: Set<string>;
    private maxCacheSize: number;

    constructor(maxCacheSize = 10000) {
        this.root = this.createNode("");
        this.cache = new Map();
        this.staticRoutes = new Map();
        this.prefixCache = new Set();
        this.maxCacheSize = maxCacheSize;
    }

    private createNode(path: string): RadixNode {
        return {
            path,
            handlers: new Map(),
            children: new Map(),
            priority: 0
        };
    }

    add(route: Route): void {
        let path = route.path;
        if (path[0] !== "/") path = "/" + path;

        if (path.length > 1 && path[path.length - 1] === "/") {
            path = path.slice(0, -1);
        }

        route.path = path;
        route.paramNames = this.getParamNames(path);

        const method = route.method.toUpperCase();

        if (!path.includes(":") && !path.includes("*")) {
            if (!this.staticRoutes.has(path)) {
                this.staticRoutes.set(path, new Map());
            }
            this.staticRoutes.get(path)!.set(method, route);
        }

        const segments = path.split("/").filter(Boolean);

        for (let i = 1; i <= segments.length; i++) {
            const prefix = "/" + segments.slice(0, i).join("/");
            this.prefixCache.add(prefix);
        }

        this.prefixCache.add("/");

        let node = this.root;
        for (const segment of segments) {
            if (segment[0] === ":") {
                if (!node.paramChild) {
                    node.paramChild = this.createNode(":");
                }
                node = node.paramChild;
                node.priority++;
                continue;
            }
            if (segment === "*") {
                if (!node.wildcardChild) {
                    node.wildcardChild = this.createNode("*");
                }
                node = node.wildcardChild;
                node.priority++;
                continue;
            }

            if (!node.children.has(segment)) {
                node.children.set(segment, this.createNode(segment));
            }

            node = node.children.get(segment)!;
            node.priority++;
        }

        node.handlers.set(method, route);

        this.clearCache();
    }

    find(method: string, path: string): RouteMatch | null {
        if (path[0] !== "/") {
            path = "/" + path;
        }
        if (path.length > 1 && path[path.length - 1] === "/") {
            path = path.slice(0, -1);
        }
        const methodUpper = method.toUpperCase();
        const staticHandlers = this.staticRoutes.get(path);

        if (staticHandlers) {
            const route = staticHandlers.get(methodUpper);
            if (route) {
                return { route, params: {} };
            }
        }

        const cacheKey = methodUpper + ":" + path;
        const cached = this.cache.get(cacheKey);

        if (cached) {
            return {
                route: cached.route,
                params: {
                    ...cached.params
                }
            };
        }

        const segments = path.split("/").filter(Boolean);

        const values: string[] = [];
        const result = this.search(this.root, segments, 0, methodUpper, values);

        if (result && this.cache.size < this.maxCacheSize) {
            this.cache.set(cacheKey, {
                route: result.route,
                params: {
                    ...result.params
                }
            });
        }

        return result;
    }
    private search(
        node: RadixNode,
        segments: string[],
        index: number,
        method: string,
        values: string[]
    ): RouteMatch | null {
        if (index === segments.length) {
            const route = node.handlers.get(method);
            if (!route) return null;

            const params: Record<string, string> = {};
            route.paramNames.forEach((name, i) => {
                const value = values[i];
                if (value !== undefined) params[name] = value;
            });
            return { route, params };
        }

        const segment = segments[index];
        if (segment === undefined) return null; 

        const staticChild = node.children.get(segment);
        if (staticChild) {
            const result = this.search(
                staticChild,
                segments,
                index + 1,
                method,
                values
            );
            if (result) return result;
        }

        if (node.paramChild) {
            values.push(segment);
            const result = this.search(
                node.paramChild,
                segments,
                index + 1,
                method,
                values
            );
            if (result) return result;
            values.pop();
        }

        if (node.wildcardChild) {
            const wildcardValue = segments.slice(index).join("/");
            const route = node.wildcardChild.handlers.get(method);

            if (route) {
                const params: Record<string, string> = {};
                route.paramNames.forEach((name, i) => {
                    const value = values[i];
                    if (value !== undefined) params[name] = value;
                });
                params["*"] = wildcardValue;
                return { route, params };
            }
        }

        return null;
    }
    clearCache(): void {
        this.cache.clear();
    }

    getParamNames(path: string): string[] {
        return path
            .split("/")
            .filter(Boolean)
            .filter(segment => segment.startsWith(":"))
            .map(segment => segment.slice(1));
    }

    getStats() {
        return {
            cacheSize: this.cache.size,
            maxCacheSize: this.maxCacheSize,
            prefixCacheSize: this.prefixCache.size,
            staticRoutes: this.staticRoutes.size
        };
    }

    isEmpty(): boolean {
        return (
            this.root.handlers.size === 0 &&
            this.root.children.size === 0 &&
            !this.root.paramChild &&
            !this.root.wildcardChild
        );
    }
}
