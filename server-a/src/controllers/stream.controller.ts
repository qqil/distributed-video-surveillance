import type { WebsocketHandler } from "@fastify/websocket";
import logger from "../services/logger.service";
import mediamtxService from "../services/mediamtx.service";
import type { RawData, WebSocket } from "ws";
import type { ClientMessage, ServerMessage } from "../types/mediamtx";
import { isClientMessage } from "../types/mediamtx";

const clientMap = new Map<string, WebSocket[]>();

const parseMessage = (raw: RawData): ClientMessage | null => {
  const text = Buffer.isBuffer(raw)
    ? raw.toString("utf8")
    : Array.isArray(raw)
      ? Buffer.concat(raw).toString("utf8")
      : Buffer.from(raw).toString("utf8");
  const message = JSON.parse(text) as unknown;

  return isClientMessage(message) ? message : null;
};

const streamHandler: WebsocketHandler = (socket, req) => {
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

  const send = (message: ServerMessage): void => {
    socket.send(JSON.stringify(message));
  };

  const onResume = (): void => {
    send({ type: "started" });
  };

  mediamtxService.registerConnection(onResume);

  let sessionLocation: string | undefined;

  socket.on("message", (raw) => {
    let message: ClientMessage | null;

    try {
      message = parseMessage(raw);
    } catch {
      send({ type: "error", message: "Invalid JSON" });
      return;
    }

    if (!message) {
      send({ type: "error", message: "Invalid message format" });
      return;
    }

    mediamtxService
      .negotiate(message.sdp)
      .then(({ answerSdp, sessionLocation: location }) => {
        sessionLocation = location;
        mediamtxService.registerSession(location, () => {
          sessionLocation = undefined;
          send({ type: "stopped" });
        });
        send({ type: "answer", sdp: answerSdp });
      })
      .catch((err: unknown) => {
        const errMessage = err instanceof Error ? err.message : String(err);

        if (errMessage === "VIDEO_STOPPED") {
          send({ type: "stopped" });
          return;
        }

        logger.error(`WHEP negotiation failed for ${clientId}: ${errMessage}`);
        send({ type: "error", message: "Negotiation failed" });
      });
  });

  socket.on("close", () => {
    clientMap.set(
      clientId,
      clientMap.get(clientId)?.filter((s) => !Object.is(s, socket)) ?? [],
    );
    logger.info(`WebSocket connection closed for client ${clientId}`);

    mediamtxService.unregisterConnection(onResume);

    if (sessionLocation) {
      mediamtxService.unregisterSession(sessionLocation);
      mediamtxService.endSession(sessionLocation).catch((err: unknown) => {
        const errMessage = err instanceof Error ? err.message : String(err);
        logger.error(
          `Failed to end WHEP session for ${clientId}: ${errMessage}`,
        );
      });
    }
  });

  socket.on("error", (err) => {
    logger.error(`WebSocket error for client ${clientId}: ${err.message}`);
  });
};

export default {
  streamHandler,
};
