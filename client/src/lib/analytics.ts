export function shouldLoadAnalytics(
  endpoint: string | undefined,
  websiteId: string | undefined
): endpoint is string {
  return Boolean(
    endpoint &&
      websiteId &&
      !endpoint.includes("%") &&
      !websiteId.includes("%")
  );
}
