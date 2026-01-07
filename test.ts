import fs from "fs";

import App from "./src"; // Your framework
import { logger, timing, serveStatic } from "./src/middleware";
// Create root app
const app = new App();

app.use(logger);
app.use(timing);
app.use(serveStatic("public")); // this will autocraticly serve any static file from your diclared folder like  http:/..:300/image.png searves public/image.png

// Global middleware
app.use(async (ctx, next) => {
    console.log("Global middleware");
    await next();
});

// Root route
app.get("/", ctx => (ctx.body = "Home"));


// render html 
app.get("/html", ctx => {
    ctx.type = "html";
    ctx.body = `
    <html>
      <body>
        <h1>Hello Framework</h1>
      </body>
    </html>
  `;
});

// manualy serve static file
app.get("/file", ctx => {
    ctx.type = "png";
    ctx.body = fs.createReadStream("./public/image.png");
});

// Plugin with prefix
app.register(users => {
    users.use(async (ctx, next) => {
        console.log("Users middleware");
        await next();
    });

    users.get("/:id", ctx => {
        ctx.body = { id: ctx.params.id };
    });
    users.post("/:id", ctx => {
        ctx.body = {
            id: ctx.params.id,
            body: ctx.request.body
        };
    });
}, "/users");

// Nested plugin with prefix
app.register(api => {
    api.get("/status", ctx => (ctx.body = { ok: true }));
}, "/api");

app.listen(3000);
console.log("Server running at http://localhost:3000");
