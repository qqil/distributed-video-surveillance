import { config } from "../config";

interface WhepSession {
  answerSdp: string;
  location: string;
}

const authHeader = (): string =>
  "Basic " +
  Buffer.from(`${config.mediamtxUser}:${config.mediamtxPassword}`).toString(
    "base64",
  );

async function createWhepSession(offerSdp: string): Promise<WhepSession> {
  const url = `${config.mediamtxWebrtcUrl}/${config.mediamtxStreamPath}/whep`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/sdp",
      Accept: "application/sdp",
      Authorization: authHeader(),
    },
    body: offerSdp,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `WHEP negotiation failed: ${res.status} ${res.statusText} ${body}`,
    );
  }

  const answerSdp = await res.text();
  const locationHeader = res.headers.get("location");

  if (!locationHeader) {
    throw new Error("WHEP response is missing a Location header");
  }

  const location = new URL(locationHeader, config.mediamtxWebrtcUrl).toString();

  return { answerSdp, location };
}

async function deleteWhepSession(location: string): Promise<void> {
  const res = await fetch(location, {
    method: "DELETE",
    headers: { Authorization: authHeader() },
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(
      `Failed to delete WHEP session: ${res.status} ${res.statusText}`,
    );
  }
}

export { createWhepSession, deleteWhepSession };
export type { WhepSession };
