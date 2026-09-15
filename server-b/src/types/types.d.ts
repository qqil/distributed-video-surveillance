import "fastify";
import { UserPayload } from "./user";

declare module "fastify" {
  interface FastifyRequest {
    // Add your custom properties here
    user?: UserPayload;
  }
}
