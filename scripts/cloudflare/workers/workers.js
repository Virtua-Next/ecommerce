// called by: deployWorker
export function generateWranglerConfig(env, workerName) {
    return `
{
    "$schema": "node_modules/wrangler/config-schema.json",
    "name": "${workerName}",
    "main": ".open-next/worker.js",
    "account_id": "${env.ACCOUNT_ID}",
    "compatibility_date": "2026-08-22",
    "upload_source_maps": true,
    "observability": {
        "enabled": true
    },
    "compatibility_flags": [
        "nodejs_compat",
        "global_fetch_strictly_public"
    ],
    "assets": {
        "binding": "ASSETS",
        "directory": ".open-next/assets"
    },
    "routes": [
        {
            "pattern": "${env.DOMAIN}",
            "custom_domain": true
        },
        {
            "pattern": "www.${env.DOMAIN}",
            "custom_domain": true
        }
    ],
    "images": {
        "binding": "IMAGES"
    },
    "services": [
	    {
		    "binding": "WORKER_SELF_REFERENCE",
			"service": "${workerName}"
		}
    ],
    "d1_databases": [
        {
            "binding": "DB",
            "database_name": "${env.DATABASE_NAME}",
            "database_id": "${env.DATABASE_ID}"
        },
    	{
			"binding": "NEXT_TAG_CACHE_D1", 
			"database_name": "${env.CACHE_DATABASE_NAME}",
			"database_id": "${env.CACHE_DATABASE_ID}"
		}
    ],
    "secrets_store_secrets": [
        {
            "binding": "JWT",
            "store_id": "${env.STORE_ID}",
            "secret_name": "VN_JWT_SECRET"
        },
        {
            "binding": "VN_CPLANE",
            "store_id": "${env.STORE_ID}",
            "secret_name": "VN_CPLANE"
        },
        {
            "binding": "VN_PUBLIC_LICENCE",
            "store_id": "${env.STORE_ID}",
            "secret_name": "VN_PUBLIC_LICENCE"
        },
        {
            "binding": "VN_LICENCE_KEY",
            "store_id": "${env.STORE_ID}",
            "secret_name": "VN_LICENCE_KEY"
        }
    ],
    "vars": {
        "JWT_EXPIRES_IN": "3d"
    }
}`.trim();}

// called by: ensureSafeToRedeploy
export async function getWorkerMetadata(accountId, workerName, apiToken) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiToken}` } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result;
}

// called by: ensureSafeToRedeploy
export async function deleteWorkerScript(accountId, workerName, apiToken) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`;
    const res = await fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${apiToken}` } });
    const data = await res.json();
    if (!data.success) throw new Error(`Falha ao deletar worker: ${data.errors?.[0]?.message}`);
}

