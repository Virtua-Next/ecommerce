import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();




// import { defineCloudflareConfig } from "@opennextjs/cloudflare";
// import d1TagCache from '@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache';

// export default defineCloudflareConfig({
//   incrementalCache: "dummy",
//   tagCache: d1TagCache
// });


// import { defineCloudflareConfig } from "@opennextjs/cloudflare";
// import d1TagCache from '@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache';
// import kvIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache';

// export default defineCloudflareConfig({
// 	tagCache: d1TagCache,
//     incrementalCache: kvIncrementalCache
// 	// Uncomment to enable R2 cache,
// 	// It should be imported as:
// 	// `import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";`
// 	// See https://opennext.js.org/cloudflare/caching for more details
// 	// incrementalCache: r2IncrementalCache,
// });
