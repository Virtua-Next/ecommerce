import { getCloudflareContext } from '@opennextjs/cloudflare';


export function getDb() {
  const { env } = getCloudflareContext();
  return env.DB;
}

export function getEnv() {
  return getCloudflareContext().env;
}

export function getCtx() {
    return getCloudflareContext().ctx;
}
