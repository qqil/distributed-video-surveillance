import type { FastifyPluginCallback } from "fastify";
import wsController from "../controllers/ws.controller";
import { authenticate } from "../middleware/auth.middleware";

const wsRouter: FastifyPluginCallback = (fastify) => {
  fastify.addHook("onRequest", authenticate);
  fastify.get("/", { websocket: true }, wsController.initHandler);
};

export { wsRouter };
