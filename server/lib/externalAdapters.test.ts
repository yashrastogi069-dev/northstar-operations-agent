import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("external provider adapters", () => {
  it("sends bounded LLM requests to the configured OpenAI-compatible endpoint", async () => {
    vi.stubEnv("OPENAI_BASE_URL", "https://llm.example.test/v1");
    vi.stubEnv("OPENAI_API_KEY", "test-only-key");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "test",
          created: 1,
          model: "test-model",
          choices: [{ index: 0, message: { role: "assistant", content: "ok" }, finish_reason: "stop" }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const { invokeLLM } = await import("../_core/llm");
    await invokeLLM({ messages: [{ role: "user", content: "hello" }], maxTokens: 8 });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://llm.example.test/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer test-only-key" }),
      }),
    );
  });

  it("reports external S3 storage readiness only when all required values exist", async () => {
    vi.stubEnv("S3_ENDPOINT", "https://storage.example.test");
    vi.stubEnv("S3_BUCKET", "northstar-test");
    vi.stubEnv("S3_ACCESS_KEY_ID", "test-access");
    vi.stubEnv("S3_SECRET_ACCESS_KEY", "test-secret");

    const { externalStorageReady, storageProvider } = await import("../storage");
    expect(externalStorageReady()).toBe(true);
    expect(storageProvider()).toBe("s3-compatible");
  });

  it("rejects non-HTTPS external notification webhooks", async () => {
    vi.stubEnv("NOTIFICATION_WEBHOOK_URL", "http://unsafe.example.test/hook");
    const { notifyOwner } = await import("../_core/notification");

    await expect(notifyOwner({ title: "Test", content: "Test" })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });
});
