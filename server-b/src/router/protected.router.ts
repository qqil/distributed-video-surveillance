import type { FastifyPluginCallback } from "fastify";
import protectedController from "../controllers/protected.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { UserRole } from "../types/user";

const protectedRouter: FastifyPluginCallback = (fastify) => {
  fastify.addHook("onRequest", authenticate);
  fastify.get(
    "/",
    {
      onRequest: authorize([UserRole.Viewer, UserRole.Operator]),
    },
    protectedController.protectedHandler,
  );
};

export { protectedRouter };
