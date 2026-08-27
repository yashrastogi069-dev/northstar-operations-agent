import { describe, expect, it } from "vitest";
import { executeAgentTool } from "./agentTools";

describe("Northstar bounded tools", () => {
  it("performs local structured analysis without an external connection", async () => {
    const result = await executeAgentTool("structured_analysis", { query: "analyse quarterly spend", role: "user", dataText: "team,spend\nA,12\nB,18" });
    expect(result.status).toBe("succeeded");
    expect(result.summary).toMatch(/2 rows/i);
    expect(result.data).toMatchObject({ rowCount: 2 });
  });

  it("fails gracefully instead of fabricating insight when data is insufficient", async () => {
    const result = await executeAgentTool("structured_analysis", { query: "analyse", role: "user", dataText: "team" });
    expect(result.status).toBe("failed");
    expect(result.summary).toMatch(/header and at least one data row/i);
  });
});
