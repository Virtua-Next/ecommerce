import nodemailer from "nodemailer";
import { execSync } from "child_process"
import { deleteCustomDomainIfExists } from "./cloudflare/zone/zones.js";
import { generateWranglerConfig, getWorkerMetadata, deleteWorkerScript } from "./cloudflare/workers/workers.js";
import { runSql, updateCpDatabase, findExistingAppByDatabaseName } from "./cloudflare/database/d1.js";
import updateSql from "./cloudflare/database/updateSql.js";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// called by: deployWorker
async function ensureSafeToRedeploy({ cpAccountId, cpDatabaseId, cpApiToken, clientAccountId, clientApiToken, workerName, hostname, databaseName }) {
    // 1. O worker existe DE FATO na conta do cliente?
    const existing = await getWorkerMetadata(clientAccountId, workerName, clientApiToken);
    if (!existing) return;

    // 2. Existe registro no MEU banco de controle pra esse databaseName?
    const ownApp = await findExistingAppByDatabaseName(cpAccountId, cpDatabaseId, cpApiToken, databaseName);
    const isMine = ownApp !== null; // existiu registro = fui eu que criei esse nome em algum momento

    if (!isMine) {
        throw new Error(
            `Já existe um worker chamado "${workerName}" nesta conta que não consta como criado por esta plataforma. ` +
            `Por segurança, não vamos sobrescrevê-lo automaticamente. Remova-o manualmente pelo dashboard da Cloudflare, ` +
            `ou entre em contato com o suporte se acredita que isso é um erro.`
        );
    }

    console.warn(`App "${databaseName}" já registrado por esta plataforma, limpando antes do redeploy...`);
    await deleteCustomDomainIfExists(clientAccountId, hostname, clientApiToken);
    await deleteWorkerScript(clientAccountId, workerName, clientApiToken);
}

// called by: deployWorker
function removeDbSuffix(name) {
    return name.endsWith('-db') ? name.slice(0, -3) : name;
}

// called by: deploy-useer.js
export async function generateLicenseApiKey() {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));

    const hexString = Array.from(randomBytes)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');

    return hexString;
}

// called by: deploy-user.js, deployApp
export async function deployWorker(domain, accoundId, fullToken, databaseName, databaseId, dbCacheName, dbCacheId, storeId, appLicenceKey, vnPublicLicence, isUpdate) {
    const ecommerceDir = path.resolve(__dirname, "../apps/ecommerce");
    const wranglerPath = path.join(ecommerceDir, "wrangler.jsonc");
    const workerName = `${removeDbSuffix(databaseName)}-ecommerce`;

    if (!isUpdate) {
        await ensureSafeToRedeploy({
            cpAccountId: process.env.CP_ACCOUNT_ID,
            cpDatabaseId: process.env.CP_DB_ID,
            cpApiToken: process.env.CP_API_TOKEN,
            clientAccountId: accoundId,
            clientApiToken: fullToken,
            workerName,
            databaseName,
        });
    }

    const wranglerConfig = generateWranglerConfig({
        ACCOUNT_ID: accoundId,
        DOMAIN: domain,
        DATABASE_NAME: databaseName,
        DATABASE_ID: databaseId,
        CACHE_DATABASE_NAME: dbCacheName,
        CACHE_DATABASE_ID: dbCacheId,
        STORE_ID: storeId,
        VN_LICENCE_KEY: appLicenceKey,
        VN_PUBLIC_LICENCE: vnPublicLicence
    }, workerName);

    try {
        // gera wrangler.jsonc
        fs.writeFileSync(wranglerPath, wranglerConfig, "utf-8");

        // deploy
        execSync("npm run deploy", {
            cwd: ecommerceDir,
            stdio: "inherit",
            env: {
                ...process.env,
                CLOUDFLARE_API_TOKEN: fullToken,
            }
        });

    } finally {
        if (fs.existsSync(wranglerPath)) {
            fs.unlinkSync(wranglerPath);
        }
    }
    return workerName;
}

// called by: notifyByEmail
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

// called by: deploy-user.js
export async function notifyByEmail(email, subject, body) {
    await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: email,
        subject,
        text: body,
    });
}

// called by: deploy-all-users.js
export async function deployApp(item, { vnPublicLicence, cpAccountId, cpDatabaseId, cpApiToken, version, deployType, updateDatabase, isUpdate }) {
    const result = {
        appUuid: item.app.uuid,
        userUuid: item.uuid,
        domain: item.app.domain,
        status: "update-deployed",
        errors: [],
    };

    // Migração de schema no banco do usuário, só quando explicitamente ligado
    if (updateDatabase) {
        try {

            await runSql(item.fullToken, item.accountId, item.app.databaseId, updateSql);

            console.log(`✅ OK executou SQL de migração - ${item.app.domain}`);
        } catch (error) {
            result.errors.push(`SQL migration failed: ${error.message}`);
            result.status = "update-failed";
        }
    }

    try {
        await deployWorker(item.app.domain, item.accountId, item.fullToken, item.app.databaseName, item.app.databaseId, item.app.cachedatabaseName, item.app.cachedatabaseId, item.storeId, item.app.appLicenceKey, vnPublicLicence, isUpdate);

        console.log(`✅ OK ${item.app.domain}`);
    } catch (error) {
        result.errors.push(`Failed: ${error.message}`);
        result.status = "update-failed";
    }

    // Atualiza o painel de controle PRA ESSE APP, independentemente de sucesso ou falha
    try {
        const appId = item.app.id;
        const userId = item.id;
        const status = result.status;
        await updateCpDatabase(cpAccountId, cpDatabaseId, cpApiToken, appId, userId, status, version, deployType);
    } catch (error) {
        result.errors.push(`Failed to update control panel: ${error.message}`);
    }

    return result;
}

