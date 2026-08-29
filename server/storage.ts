import { randomUUID } from "node:crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function hasExternalStorageConfig(): boolean {
  return Boolean(
    ENV.storageEndpoint &&
      ENV.storageBucket &&
      ENV.storageAccessKeyId &&
      ENV.storageSecretAccessKey,
  );
}

function externalClient(): S3Client {
  if (!hasExternalStorageConfig()) {
    throw new Error(
      "External storage is not configured. Set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.",
    );
  }

  return new S3Client({
    region: ENV.storageRegion,
    endpoint: ENV.storageEndpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: ENV.storageAccessKeyId,
      secretAccessKey: ENV.storageSecretAccessKey,
    },
  });
}

function legacyForgeConfig() {
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    throw new Error(
      "Storage is not configured. Prefer S3_ENDPOINT/S3_BUCKET/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY for external deployment.",
    );
  }
  return { forgeUrl: ENV.forgeApiUrl.replace(/\/+$/, ""), forgeKey: ENV.forgeApiKey };
}

async function legacyStoragePut(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
): Promise<{ key: string; url: string }> {
  const { forgeUrl, forgeKey } = legacyForgeConfig();
  const presignUrl = new URL("v1/storage/presign/put", `${forgeUrl}/`);
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });
  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Legacy storage presign failed (${presignResp.status}): ${msg}`);
  }
  const { url } = (await presignResp.json()) as { url?: string };
  if (!url) throw new Error("Legacy storage returned an empty presign URL");
  const body = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  const uploadResp = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body,
  });
  if (!uploadResp.ok) throw new Error(`Legacy storage upload failed (${uploadResp.status})`);
  return { key, url: `/manus-storage/${key}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  if (!hasExternalStorageConfig()) return legacyStoragePut(key, data, contentType);

  const client = externalClient();
  const body = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  await client.send(
    new PutObjectCommand({
      Bucket: ENV.storageBucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: ENV.storageBucket, Key: key }),
    { expiresIn: 900 },
  );
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: await storageGetSignedUrl(key) };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  if (!hasExternalStorageConfig()) {
    const { forgeUrl, forgeKey } = legacyForgeConfig();
    const getUrl = new URL("v1/storage/presign/get", `${forgeUrl}/`);
    getUrl.searchParams.set("path", key);
    const response = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${forgeKey}` },
    });
    if (!response.ok) {
      const msg = await response.text().catch(() => response.statusText);
      throw new Error(`Legacy storage signed URL failed (${response.status}): ${msg}`);
    }
    const { url } = (await response.json()) as { url?: string };
    if (!url) throw new Error("Legacy storage returned an empty signed URL");
    return url;
  }

  return getSignedUrl(
    externalClient(),
    new GetObjectCommand({ Bucket: ENV.storageBucket, Key: key }),
    { expiresIn: 900 },
  );
}

export function externalStorageReady(): boolean {
  return hasExternalStorageConfig();
}

export function storageProvider(): "s3-compatible" | "legacy-managed" {
  return hasExternalStorageConfig() ? "s3-compatible" : "legacy-managed";
}

export const storage = { externalStorageReady, storageProvider };
