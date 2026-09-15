import fastify, { type FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import websocket from "@fastify/websocket";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import { streamRouter } from "./router/stream.router";
import { config } from "./config";
import { startVideo, stopVideo, getStatus } from "./grpc/stream-manager";

async function startApp(): Promise<FastifyInstance> {
  const app = fastify();

  // Setup app
  app.register(helmet);
  app.register(cookie, { hook: "onRequest" });
  app.register(websocket);

  // Setup routes
  app.register(streamRouter, { prefix: "/stream" });

  // Start the server
  const address = await app.listen({ port: 3000, host: "0.0.0.0" });
  console.log(`Server listening at ${address}`);

  return app;
}

async function startGrpcServer(): Promise<void> {
  const packageDefinition = protoLoader.loadSync(
    path.join(__dirname, "grpc/stream-manager.proto"),
    {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    },
  );

  // The loaded proto definition is cast to the expected type for the StreamManager service because TypeScript cannot infer the types from the loaded proto file.
  const proto = grpc.loadPackageDefinition(packageDefinition) as unknown as {
    StreamManager: grpc.ServiceClientConstructor;
  };

  const server = new grpc.Server();
  server.addService(proto.StreamManager.service, {
    StartVideo: startVideo,
    StopVideo: stopVideo,
    GetStatus: getStatus,
  });

  return new Promise((resolve, reject) => {
    server.bindAsync(
      `0.0.0.0:${config.grpcPort}`,
      grpc.ServerCredentials.createInsecure(),
      (err, port) => {
        if (err) {
          reject(err);
          return;
        }

        console.log(`gRPC server listening at 0.0.0.0:${port}`);
        resolve();
      },
    );
  });
}

Promise.all([startApp(), startGrpcServer()])
  .then(() => {
    console.log("Server has been started successfully.");
  })
  .catch((err) => {
    console.error("Error starting server:", err);
    process.exit(1);
  });
