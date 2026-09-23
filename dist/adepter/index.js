"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVercelHandler = exports.createNodeServer = exports.createMock = void 0;
var mock_1 = require("./mock");
Object.defineProperty(exports, "createMock", { enumerable: true, get: function () { return mock_1.createMock; } });
var node_1 = require("./node");
Object.defineProperty(exports, "createNodeServer", { enumerable: true, get: function () { return node_1.createNodeServer; } });
var vercel_1 = require("./vercel");
Object.defineProperty(exports, "createVercelHandler", { enumerable: true, get: function () { return vercel_1.createVercelHandler; } });
