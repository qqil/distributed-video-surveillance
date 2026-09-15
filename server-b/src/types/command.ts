export enum Command {
  START_VIDEO = "START_VIDEO",
  STOP_VIDEO = "STOP_VIDEO",
  GET_STATUS = "GET_STATUS",
  LOGOUT = "LOGOUT",
}

export const isCommand = (value: unknown): value is Command => {
  if (typeof value !== "string") {
    return false;
  }

  return Object.values(Command).includes(value as Command);
};
