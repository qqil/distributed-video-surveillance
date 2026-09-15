import fastify, { FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import websocket from "@fastify/websocket";
import { config } from "./config";
import { authRouter } from "./router/auth.router";
import { wsRouter } from "./router/ws.router";
import { protectedRouter } from "./router/protected.router";

async function startApp(): Promise<FastifyInstance> {
  const app = fastify();

  // Setup app
  app.register(helmet);
  app.register(cors, {
    origin: config.frontendOrigin,
    credentials: true,
  });
  app.register(cookie, { hook: "onRequest" });
  app.register(websocket);

  // Setup routes
  app.register(authRouter, { prefix: "/auth" });
  app.register(wsRouter, { prefix: "/ws" });
  app.register(protectedRouter, { prefix: "/protected" });

  // TODO: Implement JWKS endpoint for command encryption
  // app.get("/.well-known/jwks.json", async (request, reply) => {
  //   // Replace this with the actual JWKS retrieval logic
  //   const jwks = {
  //     keys: [],
  //   };
  //   reply.send(jwks);
  // });

  // Start the server
  const address = await app.listen({ port: 3000, host: "0.0.0.0" });
  console.log(`Server listening at ${address}`);

  return app;
}

startApp()
  .then(() => {
    console.log("Server has been started successfully.");
  })
  .catch((err) => {
    console.error("Error starting server:", err);
    process.exit(1);
  });
