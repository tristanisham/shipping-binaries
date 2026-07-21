import { Hono } from "hono";
import { authRoute } from "./routes/auth.js";
import { weatherRoute } from "./routes/weather.js";
import { About } from "./views/About.js";
import { Home } from "./views/Home.js";

const app = new Hono<{ Bindings: Env }>();

app.route("/", authRoute);
app.route("/", weatherRoute);

app.get("/", (c) => {
  return c.html(<Home />);
});

app.get("/about", (c) => {
  return c.html(<About />);
});

export default app;
