import { WebsocketHandler } from "@fastify/websocket";
import type WebSocket from "ws";
import logger from "../services/logger.service";
import { Command, isCommand } from "../types/command";
import { executeCommand } from "../services/command.service";

// One client can have multiple WebSocket connections from different devices or browser tabs.
const clientMap = new Map<string, WebSocket[]>();

const initHandler: WebsocketHandler = (socket, req) => {
  const user = req.user;
  const clientId = user?.login;

  if (!clientId) {
    throw new Error("Client ID is missing");
  }

  if (!clientMap.has(clientId)) {
    clientMap.set(clientId, []);
  }

  clientMap.get(clientId)?.push(socket);

  logger.info(`Client ${clientId} connected`);

  socket.on("message", (message) => {
    void (async () => {
      const command = Buffer.concat(
        Array.isArray(message)
          ? message
          : [
              Buffer.from(
                message instanceof ArrayBuffer
                  ? new Uint8Array(message)
                  : message,
              ),
            ],
      ).toString("utf-8");

      if (!isCommand(command)) {
        logger.error(`Received unknown command: ${JSON.stringify(command)}`);
        return;
      }

      logger.debug(`Received command: ${command}`);

      try {
        const result = await executeCommand(command, user);
        if (result) {
          socket.send(result);
        }

        if (command === Command.LOGOUT) {
          const clientSockets = clientMap.get(clientId) ?? [];
          for (const s of clientSockets) {
            s.close(1000, "Logged out");
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : JSON.stringify(error);
        logger.error(`Failed to execute command: ${message}`);

        const clientSockets = clientMap.get(clientId) ?? [];
        for (const s of clientSockets) {
          s.send(`Failed to execute command: ${message}`);
        }
      }
    })();
  });

  socket.on("close", () => {
    clientMap.set(
      clientId,
      clientMap.get(clientId)?.filter((s) => !Object.is(s, socket)) ?? [],
    );
    logger.info(`WebSocket connection closed for client ${clientId}`);
  });

  socket.on("error", (err) => {
    logger.error(`WebSocket error for client ${clientId}: ${err.message}`);
  });
};

export default {
  initHandler,
};
