"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = exports.EventEmitter = void 0;
var events_1 = require("./events");
Object.defineProperty(exports, "EventEmitter", { enumerable: true, get: function () { return events_1.EventEmitter; } });
const events_2 = require("./events");
class App extends events_2.EventEmitter {
}
exports.App = App;
