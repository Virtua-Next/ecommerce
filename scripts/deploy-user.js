import { deployWorker } from "./utils.js";
import { getUserByUuid, runSql, runSqlForInstall, createCloudflareDatabase, getCloudflareDatabaseInfo, finalizeAppInDatabase } from "./cloudflare/database/d1.js";
import { getDomainZone } from "./cloudflare/zone/zones.js";
import { generateUserJwtSecretData, getSecretsStore, createCloudflareSecretsData } from "./cloudflare/secretStore.js/secretsStore.js";
import { verifyToken, revokeToken, criarToken } from "./cloudflare/token/tokens.js";
import { generateLicenseApiKey, notifyByEmail } from "./utils.js";
import installSql from "./cloudflare/database/installSql.js";


const version = '1.0';


const userUuid = process.env.USER_UUID;
const appUuid = process.env.APP_UUID;
const cpAccountId = process.env.CP_ACCOUNT_ID;
const cpApiToken = process.env.CP_API_TOKEN;
const cpDatabaseId = process.env.CP_DB_ID;
const cpDomain = process.env.CP_DOMAIN;
const vnPublicLicence = process.env.VN_PUBLIC_LICENCE;

if (!userUuid) { throw new Error("USER_UUID not provided") }
if (!appUuid) { throw new Error("APP_UUID not provided") }

console.log(`🚀 Starting deploy for user ${userUuid} on app ${appUuid}`);

let deployStatus = "ready";
const errorLog = [];

let user;
try {
    user = await getUserByUuid(userUuid, appUuid, cpAccountId, cpDatabaseId, cpApiToken);
} catch (error) {
    errorLog.push(`Failed to get user - ${error.message}`);
    deployStatus = "failed";
}

let fullToken = user.fullToken;
let fullTokenId = null;
if (deployStatus === 'ready') {
    try {
        const isValid = fullToken ? await verifyToken(fullToken) : false;
        if (!isValid) {
            console.warn(fullToken ? "Token salvo inválido/expirado, criando um novo..." : "Nenhum token salvo, criando um novo...");
            try {
                await revokeToken(fullTokenId);
            } catch (error) {
                errorLog.push(`Failed to revoke fullToken ${fullTokenId} - ${error.message}`);
            }

            const token = await criarToken(user.token, user.accountId);
            if (!token) { throw new Error("criarToken retornou vazio") }

            fullToken = token.value;
            fullTokenId = token.id;
            await new Promise(r => setTimeout(r, 3000));
        }

    } catch (error) {
        errorLog.push(`Failed to create fullToken - ${error.message}`);
        deployStatus = "failed";
    }
}

try {
    await getDomainZone(user.app.domain, fullToken);
} catch (error) {
    errorLog.push(`Failed to verify/create domain zone - ${error.message}`);
    deployStatus = "failed";
}

let storeId;
if (deployStatus === 'ready') {
    try {
        storeId = await getSecretsStore(fullToken, user.accountId);
    } catch (error) {
        errorLog.push(`Failed to create store_secrets - ${error.message}`);
        deployStatus = "failed";
    }
}

let userJwtSecretData;
if (deployStatus === 'ready') {
    try {
        userJwtSecretData = await generateUserJwtSecretData(String(userUuid));
    } catch (error) {
        errorLog.push(`Failed to generate JWT value - ${error.message}`);
        deployStatus = "failed";
    }
}

let appLicenceKey;
try {
    appLicenceKey = await generateLicenseApiKey();
} catch (error) {
    errorLog.push(`Failed to generate appLicenceKey - ${error.message}`);
    deployStatus = "failed";
}

const secretsData = [
    { name: "VN_JWT_SECRET", value: userJwtSecretData },
    { name: "VN_CPLANE", value: cpDomain },
    { name: "VN_PUBLIC_LICENCE", value: vnPublicLicence },
    { name: "VN_LICENCE_KEY", value: appLicenceKey }
];

if (deployStatus === 'ready') {
    try {
        await createCloudflareSecretsData(fullToken, user.accountId, storeId, secretsData);
    } catch (error) {
        errorLog.push(`Failed to create or update secrets - ${error.message}`);
        deployStatus = "failed";
    }
}

let dbName;
let dbCacheName;
if (deployStatus === 'ready') {
    try {
        dbName = user.app.domain.toLowerCase().replace(/\./g, '-')
        dbName = `${dbName}-db`;

        dbCacheName = user.app.domain.toLowerCase().replace(/\./g, '-')
        dbCacheName = `${dbCacheName}-cache-db`
    } catch (error) {
        errorLog.push(`Failed to generate dbName - ${error.message}`);
        deployStatus = "failed";
    }
}

let dbInfo;
if (deployStatus === 'ready') {
    try {
        dbInfo = await createCloudflareDatabase(fullToken, user.accountId, dbName);
    } catch (error) {
        if (error?.message?.includes('already exists')) {
            try {
                dbInfo = await getCloudflareDatabaseInfo(fullToken, user.accountId, dbName);
                console.warn(`Database ${dbName} já existia, reaproveitando`);
            } catch (innerError) {
                errorLog.push(`Failed to get current  database - ${innerError.message}`);
                deployStatus = "failed";
            }
        } else {
            errorLog.push(`Failed to create database - ${error.message}`);
            deployStatus = "failed";
        }
    }
}

let dbCacheInfo;
if (deployStatus === 'ready') {
    try {
        dbCacheInfo = await createCloudflareDatabase(fullToken, user.accountId, dbCacheName);
    } catch (error) {
        if (error?.message?.includes('already exists')) {
            try {
                dbCacheInfo = await getCloudflareDatabaseInfo(fullToken, user.accountId, dbCacheName);
                console.warn(`Cache database ${dbCacheName} já existia, reaproveitando`);
            } catch (innerError) {
                errorLog.push(`Failed to get current cache database - ${innerError.message}`);
                deployStatus = "failed";
            }
        } else {
            errorLog.push(`Failed to create cache database - ${error.message}`);
            deployStatus = "failed";
        }
    }
}

if (deployStatus === 'ready') {
    try {
        const cacheSql = `CREATE TABLE IF NOT EXISTS revalidations (tag TEXT PRIMARY KEY, revalidatedAt INTEGER);`
        await runSql(fullToken, user.accountId, dbCacheInfo.id, cacheSql);
    } catch (error) {
        errorLog.push(`Failed to populate cache database - ${error.message}`);
        deployStatus = "failed";
    }
}

if (deployStatus === 'ready') {
    try {
        await runSqlForInstall(fullToken, user.accountId, dbInfo.id, installSql);
    } catch (error) {
        errorLog.push(`Failed to populate database - ${error.message}`);
        deployStatus = "failed";
    }
}

if (deployStatus === 'ready') {
    try {
        await deployWorker(user.app.domain.toLowerCase(), user.accountId, fullToken, dbInfo.name, dbInfo.id, dbCacheInfo.name, dbCacheInfo.id, storeId, appLicenceKey, vnPublicLicence);
        console.log("✅ Worker OK");
    } catch (error) {
        errorLog.push(`❌ Failed to deploy wroker - ${error.message}`);
        deployStatus = "failed";
    }
}

try {
    const databaseId = dbInfo.id;
    const databaseName = dbInfo.name;
    const userId = user.id;
    const appId = user.app.id;
    const cachedatabaseId = dbCacheInfo.id;
    const cachedatabaseName = dbCacheInfo.name;
    await finalizeAppInDatabase(cpAccountId, cpDatabaseId, cpApiToken, appUuid, userUuid, appLicenceKey, deployStatus, version, fullToken, fullTokenId, storeId, databaseId, databaseName, cachedatabaseId, cachedatabaseName, userId, appId);
} catch (error) {
    errorLog.push(`❌ Failed to finalize app in database - ${error.message}`);
    deployStatus = "failed";
}

if (deployStatus === "ready") {
    console.log(`✅ Deploy finished for user ${userUuid} on app ${appUuid}`);

    try {
        const subject = `Your app is live! 🎉`;
        const body = `Hello!

Your application has been successfully deployed and is now live.

Domain: https://${user.app.domain}
Date: ${new Date().toLocaleString("en-US")}

If you have any questions, feel free to reach out.
`;
        await notifyByEmail(user.email, subject, body);
    } catch (error) {
        errorLog.push(`Failed to notify user ${userUuid} - ${error.message}`);
    }

} else {
    errorLog.push(`❌ Deploy finished with error for user ${userUuid} on app ${appUuid}`);

    try {
        const subject = `We ran into an issue setting up your app`;
        const body = `Hello!

We encountered an issue while deploying your application, and our team has already been notified.

We'll retry shortly. If the problem persists, we'll reach out to you directly.

Sorry for the inconvenience.
`;
        await notifyByEmail(user.email, subject, body);
    } catch (error) {
        errorLog.push(`Failed to notify user ${userUuid} about failure - ${error.message}`);
    }
    console.log('Logs:', errorLog);
}
