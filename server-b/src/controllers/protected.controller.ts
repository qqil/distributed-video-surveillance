import type { RouteHandlerMethod } from "fastify";

const protectedHandler: RouteHandlerMethod = (req, reply) => {
  return reply.send({ user: req.user });
};

export default { protectedHandler };
