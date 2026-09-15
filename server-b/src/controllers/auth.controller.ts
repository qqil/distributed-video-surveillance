import type { RouteHandlerMethod } from "fastify";
import { getUserByLogin } from "../services/user.service";
import { comparePasswords, generateToken } from "../services/auth.service";

const loginHandler: RouteHandlerMethod = async (req, reply) => {
  const { login, password } = req.body as {
    login: string;
    password: string;
  };

  const user = getUserByLogin(login);
  if (!user) {
    return reply.status(401).send({ message: "Invalid login or password" });
  }

  const isPasswordValid = await comparePasswords(password, user.password);
  if (!isPasswordValid) {
    return reply.status(401).send({ message: "Invalid login or password" });
  }

  const token = await generateToken({ login: user.login, role: user.role });

  return reply
    .setCookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    })
    .send();
};

const logoutHandler: RouteHandlerMethod = async (_req, reply) => {
  return reply.clearCookie("token", { path: "/" }).send();
};

export default {
  loginHandler,
  logoutHandler,
};
