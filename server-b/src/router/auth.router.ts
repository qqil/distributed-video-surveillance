import type { FastifyPluginCallback } from "fastify";
import authController from "../controllers/auth.controller";

const authRouter: FastifyPluginCallback = (fastify) => {
  fastify.post(
    "/login",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            login: { type: "string" },
            password: { type: "string" },
          },
          required: ["login", "password"],
        },
      },
    },
    authController.loginHandler,
  );

  fastify.post("/logout", authController.logoutHandler);
};

export { authRouter };
