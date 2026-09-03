import { describe, expect, it } from "vitest";
import { getDatabasePoolOptions } from "./db";

describe("TiDB database connection options", () => {
  it("uses parsed credentials and secure TLS by default", () => {
    const options = getDatabasePoolOptions("mysql://northstar:p%40ss@gateway.tidbcloud.com:4000/firm", { connectionLimit: 7 });
    expect(options.host).toBe("gateway.tidbcloud.com");
    expect(options.port).toBe(4000);
    expect(options.user).toBe("northstar");
    expect(options.password).toBe("p@ss");
    expect(options.database).toBe("firm");
    expect(options.connectionLimit).toBe(7);
    expect(options.ssl).toEqual({ rejectUnauthorized: true });
  });

  it("requires explicit opt-out before disabling TLS", () => {
    const options = getDatabasePoolOptions("mysql://user:password@127.0.0.1:3306/local", { sslDisabled: true });
    expect(options.ssl).toBeUndefined();
  });
});
