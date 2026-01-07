import App from "./src";

import { logger, timing } from "./src/middleware";

const app = new App();

// app.use([logger, timing]);

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
app.get("/another/:id", ctx => {
    console.log("another route");
    ctx.body = "another" + ctx.params.id;
});

app.register(users => {
    users.use(async (ctx, next) => {
        console.log("Users middleware start");
        await next();
        console.log("Users middleware end");
    });

    users.get("/:id", ctx => {
        console.log("Users route");
        console.log(`your id is : ${ctx.params?.id}`);
        
        ctx.body = `your id is : ${ctx.params?.id}`;
    });
    users.use(async (ctx, next) => {
        console.log("Users closing  middleware");
        await next();
    });
}, "/user");

app.use(async (ctx, next) => {
    console.log("middleware after home and user plugin");
    await next();
});

app.listen(3000);
console.log("Server running at http://localhost:3000");
