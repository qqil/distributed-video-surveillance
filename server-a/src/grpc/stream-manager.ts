import type { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";
import logger from "../services/logger.service";
import commandLogger from "../services/command-logger.service";
import mediamtxService from "../services/mediamtx.service";

type Empty = Record<string, never>;

interface GenericReply {
  success: boolean;
  message: string;
}

const startVideo = (
  _call: ServerUnaryCall<Empty, GenericReply>,
  callback: sendUnaryData<GenericReply>,
) => {
  commandLogger.info("Received START_VIDEO");
  logger.info("gRPC StartVideo called");
  mediamtxService.startVideo();
  callback(null, { success: true, message: "Video started" });
};

const stopVideo = (
  _call: ServerUnaryCall<Empty, GenericReply>,
  callback: sendUnaryData<GenericReply>,
) => {
  commandLogger.info("Received STOP_VIDEO");
  logger.info("gRPC StopVideo called");
  mediamtxService
    .stopVideo()
    .then(() => {
      callback(null, { success: true, message: "Video stopped" });
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`gRPC StopVideo failed: ${message}`);
      callback(null, { success: false, message: "Failed to stop video" });
    });
};

const getStatus = (
  _call: ServerUnaryCall<Empty, GenericReply>,
  callback: sendUnaryData<GenericReply>,
) => {
  commandLogger.info("Received GET_STATUS");
  logger.info("gRPC GetStatus called");
  const streamRunning = mediamtxService.isStreamRunning();
  callback(null, {
    success: true,
    message: JSON.stringify({ streamRunning }),
  });
};

export { startVideo, stopVideo, getStatus };
