import bcrypt from "bcrypt";
import { SignJWT, jwtVerify } from "jose";
import { config } from "../config";
import { UserPayload } from "../types/user";

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
};

export const comparePasswords = async (
  password: string,
  hashedPassword: string,
): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

export const generateToken = async (user: {
  login: string;
  role: string;
}): Promise<string> => {
  const jwtSigner = new SignJWT({ login: user.login, role: user.role })
    .setProtectedHeader({ alg: config.jwtAlg })
    .setExpirationTime(config.jwtExpiresIn);

  const token = await jwtSigner.sign(
    new TextEncoder().encode(config.jwtSecret),
  );

  return token;
};

export const verifyToken = async (token: string): Promise<UserPayload> => {
  const { payload } = await jwtVerify<UserPayload>(
    token,
    new TextEncoder().encode(config.jwtSecret),
  );

  return payload;
};
