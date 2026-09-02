export type AdminIdentity = { openId?: string | null; email?: string | null };

export function isConfiguredAdmin(identity: AdminIdentity, config: { ownerOpenId?: string; adminEmails?: string }): boolean {
  const ownerOpenId = config.ownerOpenId?.trim();
  if (ownerOpenId && identity.openId === ownerOpenId) return true;
  const email = identity.email?.trim().toLowerCase();
  if (!email) return false;
  const allowedEmails = (config.adminEmails ?? "")
    .split(",")
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
  return allowedEmails.includes(email);
}
