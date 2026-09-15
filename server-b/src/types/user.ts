export type User = {
  login: string;
  role: UserRole;
  password: string;
};

export type UserPayload = Pick<User, "login" | "role">;

export enum UserRole {
  Viewer = "viewer",
  Operator = "operator",
}
