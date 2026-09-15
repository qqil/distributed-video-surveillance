export interface NegotiateResult {
  answerSdp: string;
  sessionLocation: string;
}

export type ForceStopListener = () => void;
export type ResumeListener = () => void;

export type ClientMessage = { type: "offer"; sdp: string };
export type ServerMessage =
  | { type: "answer"; sdp: string }
  | { type: "error"; message: string }
  | { type: "stopped" }
  | { type: "started" };

export const isClientMessage = (message: unknown): message is ClientMessage => {
  if (typeof message !== "object" || message === null) {
    return false;
  }

  if (!("type" in message) || message["type"] !== "offer") {
    return false;
  }

  if (!("sdp" in message) || typeof message["sdp"] !== "string") {
    return false;
  }

  return true;
};
