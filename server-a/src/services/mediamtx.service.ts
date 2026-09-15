import { createWhepSession, deleteWhepSession } from "../lib/mediamtx-client";
import {
  ForceStopListener,
  NegotiateResult,
  ResumeListener,
} from "../types/mediamtx";
import logger from "./logger.service";

let streamRunning = true;

const activeSessions = new Map<string, ForceStopListener>();
const signalingConnections = new Set<ResumeListener>();

function isStreamRunning(): boolean {
  return streamRunning;
}

async function negotiate(offerSdp: string): Promise<NegotiateResult> {
  if (!streamRunning) {
    throw new Error("VIDEO_STOPPED");
  }

  const { answerSdp, location } = await createWhepSession(offerSdp);
  return { answerSdp, sessionLocation: location };
}

async function endSession(sessionLocation: string): Promise<void> {
  activeSessions.delete(sessionLocation);
  await deleteWhepSession(sessionLocation);
}

function registerSession(
  sessionLocation: string,
  onForceStop: ForceStopListener,
): void {
  activeSessions.set(sessionLocation, onForceStop);
}

function unregisterSession(sessionLocation: string): void {
  activeSessions.delete(sessionLocation);
}

function registerConnection(onResume: ResumeListener): void {
  signalingConnections.add(onResume);
}

function unregisterConnection(onResume: ResumeListener): void {
  signalingConnections.delete(onResume);
}

function startVideo(): void {
  streamRunning = true;

  for (const onResume of signalingConnections) {
    onResume();
  }
}

async function stopVideo(): Promise<void> {
  streamRunning = false;

  const sessions = [...activeSessions.entries()];
  activeSessions.clear();

  await Promise.all(
    sessions.map(async ([location, onForceStop]) => {
      onForceStop();
      try {
        await deleteWhepSession(location);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(
          `Failed to end WHEP session ${location} during STOP_VIDEO: ${message}`,
        );
      }
    }),
  );
}

export default {
  negotiate,
  endSession,
  registerSession,
  unregisterSession,
  registerConnection,
  unregisterConnection,
  startVideo,
  stopVideo,
  isStreamRunning,
};
