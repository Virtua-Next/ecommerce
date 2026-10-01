import { defineCloudflareConfig } from "@opennextjs/cloudflare";
// import d1TagCache from '@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache';
// import kvIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache';
// import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

/**
 * Persistent cache (optional). With everything commented out, unstable_cache and revalidateTag still work,
 * but nothing is cached between requests: every request reads straight from the database.
 * To enable it, uncomment tagCache AND one incrementalCache together (tagCache alone does nothing).
 * The basic deploy already creates the NEXT_TAG_CACHE_D1 binding with the required tables.
 * You still need to create the binding for the chosen incrementalCache (NEXT_INC_CACHE_R2_BUCKET or NEXT_INC_CACHE_KV)
 * and the WORKER_SELF_REFERENCE service binding. If you use time-based `revalidate`, a queue (Durable Objects) is also required.
*/

export default defineCloudflareConfig({
    // tagCache: d1TagCache, // D1 (NEXT_TAG_CACHE_D1, `revalidations` table): stores the tag invalidations from revalidateTag/revalidatePath.
    // incrementalCache: r2IncrementalCache, // R2 (NEXT_INC_CACHE_R2_BUCKET): recommended option, but requires a payment method on the Cloudflare account.
    // incrementalCache: kvIncrementalCache, // KV (NEXT_INC_CACHE_KV): eventually consistent, not recommended by the OpenNext docs.
});
