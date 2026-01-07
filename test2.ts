import App from "./src";
import { logger, timing } from "./src/middleware";

const app = new App();

app.use([logger, timing]);

app.use(async (ctx, next) => {
    console.log("Global middleware");
    await next();
});

app.get("/", ctx => {
    console.log("home route");
    ctx.body = "home";
});

app.use(async (ctx, next) => {
    console.log("middleware after home");
    await next();
});

app.register(users => {
    users.use(async (ctx, next) => {
        console.log("Users middleware");
        await next();
    });

    users.get("/", ctx => {
        console.log("Users route");
        ctx.body = "user";
    });
}, "/user");

app.use(async (ctx, next) => {
    console.log("middleware after home and user plugin");
    await next();
});

app.listen(3000);
console.log("Server running at http://localhost:3000");
