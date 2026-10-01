// called by: getUserByUuid,
function mapRowToUser(row) {
    return {
        id: row.user_id,
        uuid: row.user_uuid,
        email: row.user_email,
        accountId: row.user_accountId,
        token: row.user_token,
        fullToken: row.user_fullToken,
        storeId: row.user_storeId,
        app: {
            id: row.app_id,
            uuid: row.app_uuid,
            domain: row.app_domain,
            status: row.app_status,
            databaseName: row.app_databaseName,
            databaseId: row.app_databaseId,
            cachedatabaseName: row.app_cachedatabaseName,
            cachedatabaseId: row.app_cachedatabaseId,
            licenceKey: row.app_licenceKey
        },
        control: {
            updateEligible: row.ctrl_isUpdateEligible
        }
    };
}

// called by: getUserByUuid, 
async function queryD1(cpAccountId, cpDatabaseId, cpApiToken, sql, params = []) {

    if (!cpAccountId || !cpDatabaseId || !cpApiToken) throw new Error("Secrets do control plane não disponíveis");

    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cpAccountId}/d1/database/${cpDatabaseId}/query`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${cpApiToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            sql,
            params,
        }),
    }
    );

    const data = await res.json();

    if (!res.ok) {
        throw new Error(
            data.errors?.[0]?.message || "Erro ao executar query no D1"
        );
    }

    return data.result?.[0]?.results ?? [];
}

// called by: deploy-user.js
export async function getUserByUuid(userUuid, appUuid, cpAccountId, cpDatabaseId, cpApiToken) {
    const sql = `
         SELECT
            u.user_id,
            u.user_uuid,
            u.user_email,
            u.user_accountId,
            u.user_token,
            u.user_fullToken,
            a.app_id,
            a.app_uuid,
            a.app_domain,
            a.app_status
        FROM tb_user u
        JOIN tb_app a ON a.userId = u.user_id
        WHERE u.user_uuid = ?
        AND a.app_uuid = ?
        LIMIT 1
        `
    const rows = await queryD1(cpAccountId, cpDatabaseId, cpApiToken, sql, [userUuid, appUuid]);

    if (!rows[0]) {
        throw new Error(`Usuário ${userUuid} / app ${appUuid} não encontrado`);
    }

    return mapRowToUser(rows[0]);
}

// called by: deploy-user.js
export async function createCloudflareDatabase(fullToken, accountId, dbName) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`;
    const headers = {
        "Authorization": `Bearer ${fullToken}`,
        "Content-Type": "application/json",
    };

    const body = JSON.stringify({
        name: dbName
    });

    try {
        const response = await fetch(url, { method: 'POST', headers, body });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Failed to create database: ${data.errors ? data.errors[0].message : 'Unknown error'}`);
        }

        return {
            id: data.result.uuid,
            name: data.result.name
        };

    } catch (error) {
        throw error;
    }
}

// called by: deploy-user.js
export async function getCloudflareDatabaseInfo(apiToken, accountId, dbName) {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
        }
    }
    );

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Erro ao listar databases D1: ${text}`);
    }

    const data = await response.json();

    const database = data.result.find((db) => db.name === dbName);

    if (!database) {
        throw new Error(`Database ${dbName} não encontrada`);
    }

    return {
        id: database.uuid,
        name: database.name
    };
}

// called by: deploy-user.js,
export async function runSqlForInstall(apiToken, accountId, databaseId, sql, batchSize = 5) {
    // Quebra em statements individuais
    const statements = sql.split(";").map(s => s.trim()).filter(Boolean);

    // Função para criar batches
    function chunkArray(arr, size) {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    }

    // Divide em batches
    const batches = chunkArray(statements, batchSize);

    // Executa cada batch de uma vez
    for (const batch of batches) {
        const batchSql = batch.join(";") + ";"; // junta o batch novamente
        const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ sql: batchSql }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.errors?.[0]?.message || "Erro ao executar SQL");
        }
    }
}

// called by: deploy-user.js, deployApp
export async function runSql(apiToken, accountId, databaseId, sql) {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ sql }),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.errors?.[0]?.message || "Erro ao executar SQL");
    }

    return data;
}

// called by: ensureSafeToRedeploy
export async function findExistingAppByDatabaseName(accountId, databaseId, apiToken, databaseName) {
    const query = {
        sql: `
      SELECT app_uuid, app_status, app_databaseName
      FROM tb_app
      WHERE app_databaseName = ?
      LIMIT 1;
    `,
        params: [databaseName],
    };

    const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(query),
        }
    );

    const data = await response.json();

    if (!data.success) {
        throw new Error(`Falha ao consultar tb_app: ${data.errors?.[0]?.message}`);
    }

    return data.result?.[0]?.results?.[0] ?? null;
}

// called by: deploy-user.js
export async function finalizeAppInDatabase(cpAccountId, cpDatabaseId, cpApiToken, appUuid, userUuid, appLicenceKey, deployStatus, version, fullToken, fullTokenId, storeId, databaseId, databaseName, cachedatabaseId, cachedatabaseName, userId, appId) {
    if (!cpAccountId || !cpDatabaseId || !cpApiToken) throw new Error("Missing Cloudflare credentials in environment.");

    const appQuery = {
        sql: `UPDATE tb_app SET app_licenceKey = ?, app_databaseId = ?, app_databaseName = ?, app_cachedatabaseName = ?, app_cachedatabaseId = ?, app_status = ? WHERE app_uuid = ?;`,
        params: [appLicenceKey, databaseId, databaseName, cachedatabaseName, cachedatabaseId, deployStatus, appUuid],
    };

    const userQuery = {
        sql: `UPDATE tb_user SET user_fullToken = ?, user_fullTokenId = ?, user_storeId = ? WHERE user_uuid = ?;`,
        params: [fullToken, fullTokenId, storeId, userUuid],
    };

    const controlQuery = {
        sql: `INSERT INTO tb_control (ctrl_deployVersion, ctrl_deployType, ctrl_firstDeploy, ctrl_lastDeploy, ctrl_deployStatus, ctrl_isUpdateEligible, userId, appId) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?, ?);`,
        params: [version, "basic", "deployed", 1, userId, appId],
    };

    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cpAccountId}/d1/database/${cpDatabaseId}/query`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${cpApiToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                batch: [appQuery, userQuery, controlQuery],
            }),
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        const errorMessage = data.errors?.[0]?.message || "Unknown D1 error";
        throw new Error(`Failed to finalize app in database: ${errorMessage}`);
    }

    const appChanges = data.result?.[0]?.meta?.changes ?? 0;
    const userChanges = data.result?.[1]?.meta?.changes ?? 0;
    const controlChanges = data.result?.[2]?.meta?.changes ?? 0;

    if (appChanges === 0) throw new Error(`No app found with uuid ${appUuid} — nothing was updated.`);
    if (userChanges === 0) throw new Error(`No user found with uuid ${userUuid} — nothing was updated.`);
    if (controlChanges === 0) throw new Error(`Control data not inserted for user ${userUuid}.`);

    return data;
}

// called by: deploy-all-users.js
export async function getAllActiveApps(cpAccountId, cpDatabaseId, cpApiToken) {
    const sql = `
SELECT
    u.user_id,
    u.user_uuid,
    u.user_email,
    u.user_accountId,
    u.user_fullToken,
    u.user_storeId,
    a.app_id,
    a.app_uuid,
    a.app_domain,
    a.app_databaseId,
    a.app_databaseName,
    a.app_cachedatabaseName,
    a.app_cachedatabaseId,
    a.app_licenceKey,
    c.ctrl_isUpdateEligible
FROM tb_app a
JOIN tb_user u ON u.user_id = a.userId
JOIN tb_control c ON c.userId = a.userId
WHERE a.app_status = 'ready'
AND c.ctrl_isUpdateEligible = 1`

    const rows = await queryD1(cpAccountId, cpDatabaseId, cpApiToken, sql);

    if (!rows[0]) {
        throw new Error(`Nenhum app encontrado`);
    }

    return mapRowToUser(rows[0]);
}

// called by: deployApp
export async function updateCpDatabase(cpAccountId, cpDatabaseId, cpApiToken, appId, userId, status, version, deployType) {
    if (!cpAccountId || !cpDatabaseId || !cpApiToken) {
        throw new Error("Missing Cloudflare credentials.");
    }

    const query = {
        sql: ` UPDATE tb_control SET ctrl_deployStatus = ?, ctrl_deployVersion = ?, ctrl_deployType = ?, ctrl_lastDeploy = CURRENT_TIMESTAMP WHERE userId = ? AND appId = ?;`,
        params: [status, version, deployType, userId, appId],
    };

    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cpAccountId}/d1/database/${cpDatabaseId}/query`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${cpApiToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ batch: [query] }),
    }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(`Failed to update control panel: ${data.errors?.[0]?.message || "Unknown D1 error"}`);
    }

    const changes = data.result?.[0]?.meta?.changes ?? 0;
    if (changes === 0) {
        throw new Error(`No control record found for user ${userUuid} / app ${appUuid} — nothing was updated.`);
    }

    return data;
}
