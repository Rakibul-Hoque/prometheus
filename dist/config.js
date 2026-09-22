"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultOptions = void 0;
exports.installSystem = installSystem;
const middleware_1 = require("./middleware");
const error_boundary_1 = require("./middleware/error-boundary");
const not_found_1 = require("./middleware/not-found");
const errors_1 = require("./errors");
exports.defaultOptions = {
    errorBoundary: true,
    bodyParser: true,
    logger: false,
    timing: false,
    notFound: true
};
function installSystem(app, options) {
    if (options.logger) {
        app.systemPre.push(middleware_1.logger);
    }
    if (options.errorBoundary) {
        app.systemPre.push(error_boundary_1.errorBoundary);
    }
    if (options.bodyParser) {
        app.systemPre.push(middleware_1.bodyParser);
    }
    if (options.timing) {
        app.systemPre.push(middleware_1.timing);
    }
    if (options.notFound) {
        app.systemPost.push(not_found_1.notFound);
    }
    app.on("error", errors_1.defaultOnErrorHandler);
    app.on("notFound", errors_1.defaultOnNotFoundHandler);
}
