export class EventEmitter {
    private events = {};

    on(event: string, fn: any): void {
        if (event === "error" || event === "not-Found") {
            this.events[event] = [fn];
        }

        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(fn);
    }

    emit(event: string, ...args: any[]): boolean {
        let app: App | null = this as any;

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
