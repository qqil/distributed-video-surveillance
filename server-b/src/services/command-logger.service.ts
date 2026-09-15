import pino from "pino";
import { config } from "../config";
import path from "path";

const transportTargets: any[] = [
  {
    target: "pino/file",
    options: {
      destination: path.join(__dirname, "../../commands.log"),
    },
  },
];

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
