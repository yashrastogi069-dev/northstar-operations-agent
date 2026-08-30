import type { IncomingMessage } from "node:http";

export type LocalOperatorConfig = {
  nodeEnv: string;
  accessMode: string;
  noAuth: boolean;
};

export function isLoopbackRequest(req: Pick<IncomingMessage, "headers" | "socket">): boolean {
  const host = (req.headers.host ?? "").split(":")[0].replace(/[\[\]]/g, "");
  const remoteAddress = req.socket.remoteAddress?.replace("::ffff:", "");
  return (
    (host === "localhost" || host === "127.0.0.1" || host === "::1") &&
    (remoteAddress === "127.0.0.1" || remoteAddress === "::1" || remoteAddress === undefined)
  );
}

export function shouldUseLocalOperator(
  config: LocalOperatorConfig,
  req: Pick<IncomingMessage, "headers" | "socket">
): boolean {
  return (
    config.nodeEnv !== "production" &&
    config.accessMode === "local-operator" &&
    config.noAuth &&
    isLoopbackRequest(req)
  );
}
