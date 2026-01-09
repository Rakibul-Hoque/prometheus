export class EventEmitter {
    private events = {};

    on(event, fn) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(fn);
    }

    emit(event, ...args) {
        if (!this.events[event]) return false;

        for (const fn of this.events[event]) {
            fn(...args);
        }
        return true;
    }
}
