// TODO: should be moved to a shared middleware package

import type { FastifyRequest } from "fastify/types/request";
import type { FastifyReply } from "fastify/types/reply";
import type { UserRole } from "../types/user";
import { verifyToken } from "../services/auth.service";

export const authenticate = async (
  req: FastifyRequest,
  res: FastifyReply,
): Promise<void> => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "Token missing" });
  }

  try {
    req.user = await verifyToken(token);
  } catch {
    return res.status(401).send({ message: "Invalid token" });
  }
};

export const authorize = (roles: UserRole[]) => {
  return async (req: FastifyRequest, res: FastifyReply, next: () => void) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).send({ message: "Forbidden" });
    }
    next();
  };
};
