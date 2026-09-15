import * as grpc from "@grpc/grpc-js";
import { config } from "../config";
import { StreamManagerClient, type GenericReply } from "./stream-manager";

export type { GenericReply };

const client = new StreamManagerClient(
  config.serverAGrpcUrl,
  grpc.credentials.createInsecure(),
);

function callMethod(
  method: "startVideo" | "stopVideo" | "getStatus",
  params?: Record<string, unknown>,
): Promise<GenericReply> {
  return new Promise((resolve, reject) => {
    client[method](params ?? {}, (error, response) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(response);
    });
  });
}

export const startVideo = () => callMethod("startVideo");
export const stopVideo = () => callMethod("stopVideo");
export const getStatus = () => callMethod("getStatus");
