// called by: getDomainZone
async function createZoneInCloudflare(domain, apiToken) {
    const url = 'https://api.cloudflare.com/client/v4/zones';

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: domain,
            jump_start: true
        })
    });

    const data = await response.json();

    if (data.success) {
        return data.result?.[0];
    } else {
        throw new Error('Erro ao criar zona na Cloudflare');
    }
}

// called by: deploy-user.js
export async function getDomainZone(domain, apiToken) {
    const url = `https://api.cloudflare.com/client/v4/zones?name=${domain}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            if (data.result && data.result.length > 0) {
                return data.result[0];
            } else {
                console.error(`Zona não encontrada, criando...`);
                return await createZoneInCloudflare(domain, apiToken);
            }
        } else {
            if (response.status === 404) {
                console.error(`Zona não encontrada (404), criando...`);
                return await createZoneInCloudflare(domain, apiToken);
            } else {
                throw new Error(`Falha ao buscar zona: ${data.errors ? data?.errors[0].message : 'Erro desconhecido'}`);
            }
        }
    } catch (err) {
        throw new Error(`Erro de rede ao buscar zona: ${err.message}`);
    }
}

// called by: ensureSafeToRedeploy
export async function deleteCustomDomainIfExists(accountId, hostname, apiToken) {
    const listUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/domains?hostname=${hostname}`;
    const res = await fetch(listUrl, { headers: { Authorization: `Bearer ${apiToken}` } });
    const data = await res.json();
    if (!data.success) throw new Error(`Falha ao listar custom domains: ${data.errors?.[0]?.message}`);

    for (const d of data.result) {
        await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/domains/${d.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${apiToken}` }
        });
    }
    return data.result.length;
}
