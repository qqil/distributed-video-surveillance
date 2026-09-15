import users from "../../users.json";
import { User } from "../types/user";

export const getUserByLogin = (login: string): User | undefined => {
  return (users as User[]).find((user) => user.login === login);
};
