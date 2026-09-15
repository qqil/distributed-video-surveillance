// TODO: should be moved to a shared service package
import { jwtVerify } from "jose";
import { config } from "../config";
import { UserPayload } from "../types/user";

export const verifyToken = async (token: string): Promise<UserPayload> => {
  const { payload } = await jwtVerify<UserPayload>(
    token,
    new TextEncoder().encode(config.jwtSecret),
  );

  return payload;
};
