import type { App } from "./types";

type Listener = (...args: any[]) => void;

export class EventEmitter {
    events: Record<string, Listener[]> = {};

    on(event: string, fn: Listener): this {
        if (event === "error" || event === "notFound") {
            this.events[event] = [fn];
            return this;
        }

        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(fn);
        return this;
    }

    off(event: string, fn?: Listener): this {
        if (!this.events[event]) return this;
        if (!fn) {
            delete this.events[event];
            return this;
        }
        this.events[event] = this.events[event].filter(f => f !== fn);
        return this;
    }

    emit(event: string, ...args: any[]): boolean {
        let app: App | null = this as unknown as App;

        while (app) {
            const handlers = app.events?.[event];
            if (handlers && handlers.length) {
                for (const fn of handlers) fn(...args);
                return true;
            }
            app = app.parent;
        }
        return false;
    }
}
