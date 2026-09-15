import pino from "pino";
import { config } from "../config";

const transportTargets: any[] = [];

if (process.env.NODE_ENV !== "production") {
  transportTargets.push({
    target: require.resolve("pino-pretty"),
    options: {
      colorize: true,
    },
  });
}

const logger = pino({
  level: config.logLevel,
  transport: {
    targets: transportTargets,
  },
});

export default logger;
