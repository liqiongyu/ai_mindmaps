export const DEFAULT_PLAN_KEY = "free";

export function getPlanKeyFromEnv(): string {
  const value = process.env.MMA_DEFAULT_PLAN?.trim();
  return value ? value : DEFAULT_PLAN_KEY;
}

export function getUpgradeUrlFromEnv(): string {
  const value = process.env.MMA_UPGRADE_URL?.trim();
  return value ? value : "/pricing";
}
