export const config = {
  logLevel: process.env.LOG_LEVEL ?? "info",

  jwtSecret: process.env.JWT_SECRET ?? "default_secret_key",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1h",
  jwtAlg: process.env.JWT_ALG ?? "HS256",

  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
  serverAGrpcUrl: process.env.SERVER_A_GRPC_URL ?? "localhost:50051",
};
