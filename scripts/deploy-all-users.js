import { getAllActiveApps } from "./cloudflare/database/d1.js";
import { deployApp } from "./utils.js";


const config = {
    version: "1.0",
    deployType: "basic", // basic, feature, hotfix, etc...
    isUpdate: true,
    updateDatabase: false, // true quando precisar rodar migração de schema no banco do usuário
    vnPublicLicence: process.env.VN_PUBLIC_LICENCE,
    cpAccountId: process.env.CP_ACCOUNT_ID,
    cpDatabaseId: process.env.CP_DB_ID,
    cpApiToken: process.env.CP_API_TOKEN,
};

const results = [];

let apps;
try {
    apps = await getAllActiveApps(config.cpAccountId, config.cpDatabaseId, config.cpApiToken);
} catch (error) {
    console.error(`Failed to get apps - ${error.message}`);
    process.exit(1);
}

const appsArray = Array.isArray(apps) ? apps : [apps];


for (const item of appsArray) {
    if (item.control?.updateEligible) {
        try {
            console.log(`🚀 Deploy app: ${item.app.uuid}`);

            const result = await deployApp(item, config);
            results.push(result);

        } catch (error) {
            results.push({ success: false, error: error.message });
        }
    }
}


const failed = results.filter(r => r.status === "update-failed");
const succeeded = results.filter(r => r.status === "update-deployed");


console.log(`✅ ${succeeded.length} apps atualizados, ❌ ${failed.length} falharam`);
