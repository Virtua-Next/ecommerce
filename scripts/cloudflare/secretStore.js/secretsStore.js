// called by: getSecretsStore
async function createSecretsStore(apiToken, accountId) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/secrets_store/stores`;

    const headers = {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
    };

    const body = JSON.stringify({
        name: "Automatically created"
    });


    try {
        const response = await fetch(url, { method: 'POST', headers, body });
        const data = await response.json();

        if (!response.ok) {
            console.error("Error creating store:", data);
            throw new Error(`Failed to create store: ${data.errors ? data.errors[0].message : 'Unknown error'}`);
        }

        return data.result.id; // Retorna o ID do store recém-criado

    } catch (error) {
        console.error("Error creating store:", error);
        throw error; // Relança o erro para ser tratado
    }
}

// called by: listCloudflareSecrets
async function listCloudflareSecrets(apiToken, accountId, storeId) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/secrets_store/stores/${storeId}/secrets?per_page=100`;

    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiToken}` },
    });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(`Erro ao listar secrets: ${JSON.stringify(data.errors)}`);
    }

    return data.result; // [{ id, name, ... }, ...]
}

// callet by: deploy-user.js
export async function getSecretsStore(apiToken, accountId) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/secrets_store/stores`;

    const headers = {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
    };

    try {
        const response = await fetch(url, { headers });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Error fetching stores:", errorData);
            throw new Error(`Failed to fetch stores: ${errorData.errors ? errorData.errors[0].message : 'Unknown error'}`);
        }

        const data = await response.json();

        if (data.success && data.result.length > 0) {
            return data.result[0].id; // Retorna o primeiro store encontrado
        } else {
            return await createSecretsStore(apiToken, accountId); // Cria um novo store se não encontrar
        }

    } catch (error) {
        throw error;
    }
}

// called by: deploy-user.js
export async function generateUserJwtSecretData(userUuid) {
    const encoder = new TextEncoder();
    const data = encoder.encode(userUuid);

    // Gera o hash SHA-256
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);

    // Converte o ArrayBuffer para uma string hexadecimal
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hexString = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');

    return hexString;  // Retorna a chave secreta gerada para o usuário
}

// called by: deploy-useer.js
export async function createCloudflareSecretsData(apiToken, accountId, storeId, secrets) {
    // secrets: [{ name, value, comment? }]
    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
    };

    const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/secrets_store/stores/${storeId}/secrets`;

    try {
        // 1. Descobre quais dos nomes já existem
        const existing = await listCloudflareSecrets(apiToken, accountId, storeId);
        const existingByName = new Map(existing.map((s) => [s.name, s.id]));

        const toDelete = secrets
            .filter((s) => existingByName.has(s.name))
            .map((s) => existingByName.get(s.name));

        // 2. Apaga os que colidem (em paralelo, sem derrubar tudo se um falhar)
        if (toDelete.length > 0) {
            const deleteResults = await Promise.allSettled(
                toDelete.map((secretId) =>
                    fetch(`${baseUrl}/${secretId}`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${apiToken}` },
                    })
                )
            );

            const failedDeletes = deleteResults.filter((r) => r.status === "rejected");
            if (failedDeletes.length > 0) {
                console.error("Falha ao apagar alguns secrets existentes:", failedDeletes);
            }
        }

        // 3. Cria todos de uma vez, num único POST
        const createBody = JSON.stringify(
            secrets.map((s) => ({
                name: s.name,
                scopes: s.scopes || ["workers"],
                value: s.value,
                comment: s.comment || "Secret for my application",
            }))
        );

        const response = await fetch(baseUrl, {
            method: "POST",
            headers,
            body: createBody,
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Erro ao criar secrets: ${JSON.stringify(data.errors)}`);
        }

        return data.result; // array com todos os secrets criados
    } catch (error) {
        throw error;
    }
}
