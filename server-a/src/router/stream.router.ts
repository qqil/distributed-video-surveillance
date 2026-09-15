import type { FastifyPluginCallback } from "fastify";
import wsController from "../controllers/stream.controller";
import { authenticate } from "../middleware/auth.middleware";

const streamRouter: FastifyPluginCallback = (fastify) => {
  fastify.get(
    "/",
    { websocket: true, onRequest: authenticate },
    wsController.streamHandler,
  );
};

export { streamRouter };
