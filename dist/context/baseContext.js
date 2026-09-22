"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseContextPrototype = void 0;
const http_1 = __importDefault(require("http"));
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = __importDefault(require("fs"));
const mime_1 = require("../mime");
exports.baseContextPrototype = {
    get method() {
        return this.request.method;
    },
    get path() {
        return this.request.path;
    },
    get headers() {
        return this.request.headers;
    },
    get ip() {
        return this.request.ip;
    },
    get query() {
        return this.request.query;
    },
    set query(q) {
        this.request.query = q;
    },
    get params() {
        return this.request.params;
    },
    set params(v) {
        this.request.params = v;
    },
    get body() {
        return this.response.body;
    },
    set body(v) {
        this.response.body = v;
    },
    get status() {
        return this.response.status;
    },
    set status(code) {
        this.response.status = code;
    },
    get type() {
        return this.response.type;
    },
    set type(v) {
        this.response.type = v;
    },
    get(name) {
        return this.request.get(name);
    },
    set(nameOrHeaders, value) {
        this.response.set(nameOrHeaders, value);
    },
    get currentApp() {
        return this.appStack[this.appStack.length - 1] ?? this.app;
    },
    get responded() {
        return this._responded___ === true;
    },
    async readFile(path, setType = true) {
        if (setType)
            this.type = (0, mime_1.getMimeType)(path) || "application/octet-stream";
        return await promises_1.default.readFile(path);
    },
    readStream(path, setType = true) {
        if (setType)
            this.type = (0, mime_1.getMimeType)(path) || "application/octet-stream";
        return fs_1.default.createReadStream(path);
    },
    redirect(url, status = 302) {
        this.status = status;
        this.set("Location", url);
        this._execState._redirect___ = true;
        this.end();
    },
    assert(condition, message, status = 400) {
        if (!condition)
            this.throw(status, message);
    },
    emit(event, ...args) {
        return this.currentApp.emit(event, ...args);
    },
    throw(status, message) {
        const err = new Error(message || http_1.default.STATUS_CODES[status] || "Error");
        err.status = status;
        err.expose = status < 500;
        err.app = this.currentApp;
        throw err;
    },
    send(data = null, status = null, type = null) {
        if (this._responded___)
            return;
        if (data !== null && data !== undefined)
            this.body = data;
        if (status !== null && status !== undefined)
            this.status = status;
        if (type)
            this.type = type;
        this._responded___ = true;
    },
    end(...args) {
        if (args.length > 0)
            this.send(...args);
        else
            this._responded___ = true;
    }
};
