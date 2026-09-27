"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventEmitter = void 0;
class EventEmitter {
    events = {};
    on(event, fn) {
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
    off(event, fn) {
        if (!this.events[event])
            return this;
        if (!fn) {
            delete this.events[event];
            return this;
        }
        this.events[event] = this.events[event].filter(f => f !== fn);
        return this;
    }
    emit(event, ...args) {
        let app = this;
        while (app) {
            const handlers = app.events?.[event];
            if (handlers && handlers.length) {
                for (const fn of handlers)
                    fn(...args);
                return true;
            }
            app = app.parent;
        }
        return false;
    }
}
exports.EventEmitter = EventEmitter;
