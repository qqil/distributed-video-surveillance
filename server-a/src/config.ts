export const config = {
  // rtspStreamUrl:
  //   process.env.RTSP_STREAM_URL ?? "rtsp://admin:admin123@mediamtx:8554/camera",
  jwtSecret: process.env.JWT_SECRET ?? "default_secret_key",
  logLevel: process.env.LOG_LEVEL ?? "info",
  grpcPort: process.env.GRPC_PORT ?? "50051",
  mediamtxApiUrl: process.env.MEDIAMTX_API_URL ?? "http://mediamtx:9997",
  mediamtxWebrtcUrl: process.env.MEDIAMTX_WEBRTC_URL ?? "http://mediamtx:8889",
  mediamtxUser: process.env.MEDIAMTX_USER ?? "admin",
  mediamtxPassword: process.env.MEDIAMTX_PASSWORD ?? "admin123",
  mediamtxStreamPath: process.env.MEDIAMTX_STREAM_PATH ?? "camera",
  jwksUrl:
    process.env.JWKS_URL ?? "http://server-b:3000/.well-known/stream-jwks.json",
};
