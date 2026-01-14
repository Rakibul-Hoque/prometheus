import { App } from "./types";
import type { AppOptions } from "./types";
import { logger, timing ,bodyParser} from "./middleware";
import { errorBoundary } from "./middleware/error-boundary";
import { notFound } from "./middleware/not-found";
import { defaultOnErrorHandler, defaultOnNotFoundHandler } from "./errors";




export const defaultOptions: Required<AppOptions> = {
    errorBoundary: true,
    bodyParser: true,
    logger: false,
    timing: false,
    notFound: true
};

export function installSystem(app: App) {
    if (app.options.logger) {
        app.systemPre.push(logger);
    }
    if (app.options.errorBoundary) {
        app.systemPre.push(errorBoundary);
    }
    if (app.options.bodyParser) {
        app.systemPre.push(bodyParser);
    }

    if (app.options.timing) {
        app.systemPre.push(timing);
    }

    if (app.options.notFound) {
        app.systemPost.push(notFound);
    }

    app.on("error", defaultOnErrorHandler);
    app.on("notFound", defaultOnNotFoundHandler);
}
