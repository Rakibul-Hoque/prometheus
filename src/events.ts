export class EventEmitter {
    private events = {};

    on(event: string, fn: any): void {
        if (event === "error" || event === "notFound") {
            this.events[event] = [fn]; 
            return
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
