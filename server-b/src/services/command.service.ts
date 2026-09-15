import { Command } from "../types/command";
import { UserRole, type UserPayload } from "../types/user";
import logger from "./logger.service";
import commandLogger from "./command-logger.service";
import * as streamManagerClient from "../grpc/stream-manager.client";
import type { GenericReply } from "../grpc/stream-manager.client";

export async function executeCommand(
  command: Command,
  user: UserPayload,
): Promise<string | void> {
  const commandHandler = commandHandlers[command];

  if (!commandHandler) {
    throw new Error(`Unknown command: ${command}`);
  }

  return commandHandler(user);
}

const commandHandlers: {
  [key: string]: (
    user: UserPayload,
  ) => (string | void) | Promise<string | void>;
} = {
  [Command.START_VIDEO]: startVideo,
  [Command.STOP_VIDEO]: stopVideo,
  [Command.GET_STATUS]: getStatus,
  [Command.LOGOUT]: logout,
};

function assertSuccess(reply: GenericReply, fallbackMessage: string): void {
  if (!reply.success) {
    throw new Error(reply.message || fallbackMessage);
  }
}

async function startVideo(user: UserPayload): Promise<string> {
  commandLogger.info({ user }, `Received command START_VIDEO`);

  if (user.role !== UserRole.Operator) {
    throw new Error("User does not have permission to start video");
  }

  logger.info(`Starting video for user: ${JSON.stringify(user)}`);
  const reply = await streamManagerClient.startVideo();
  logger.info(`StartVideo gRPC reply: ${JSON.stringify(reply)}`);
  assertSuccess(reply, "Failed to start video");
  return "OK";
}

async function stopVideo(user: UserPayload): Promise<string> {
  commandLogger.info({ user }, `Received command STOP_VIDEO`);

  if (user.role !== UserRole.Operator) {
    throw new Error("User does not have permission to stop video");
  }

  logger.info(`Stopping video for user: ${JSON.stringify(user)}`);
  const reply = await streamManagerClient.stopVideo();
  logger.info(`StopVideo gRPC reply: ${JSON.stringify(reply)}`);
  assertSuccess(reply, "Failed to stop video");
  return "OK";
}

async function getStatus(user: UserPayload): Promise<string> {
  commandLogger.info({ user }, `Received command GET_STATUS`);
  logger.info(`Getting status for user: ${JSON.stringify(user)}`);
  const reply = await streamManagerClient.getStatus();
  logger.info(`GetStatus gRPC reply: ${JSON.stringify(reply)}`);
  assertSuccess(reply, "Failed to get status");

  let streamRunning: boolean;
  try {
    ({ streamRunning } = JSON.parse(reply.message) as {
      streamRunning: boolean;
    });
  } catch {
    throw new Error(`Malformed status reply from server-a: ${reply.message}`);
  }

  return streamRunning ? "VIDEO_RUNNING" : "VIDEO_STOPPED";
}

function logout(user: UserPayload): string {
  commandLogger.info({ user }, `Received command LOGOUT`);
  logger.info(`Logging out user: ${JSON.stringify(user)}`);
  return "LOGGED_OUT";
}
