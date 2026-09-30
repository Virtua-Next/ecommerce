// called by: deploy-user.js, 
export async function verifyToken(token) {
    const url = "https://api.cloudflare.com/client/v4/user/tokens/verify";

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();

        // status "active" = válido e utilizável
        return response.ok && data.success && data.result?.status === "active";
    } catch (error) {
        console.error("Erro ao verificar token:", error);
        return false;
    }
}

// called by: deploy-user.js
export async function revokeToken(tokenCriadorDeToken, tokenId) {
    const url = `https://api.cloudflare.com/client/v4/user/tokens/${tokenId}`;
    await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenCriadorDeToken}` }
    });
}

// calletd by deploy-user.js
export async function criarToken(tokenCriadorDeToken, accountId) {
    const url = `https://api.cloudflare.com/client/v4/user/tokens`;

    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenCriadorDeToken}`
    };

    const body = {
        name: "Virtua Next Deployer",
        policies: [
            {
                effect: "allow",
                resources: {
                    [`com.cloudflare.api.account.${accountId}`]: "*"
                },
                permission_groups: [
                    {
                        "id": "5e33b7d77788455c9fdf18cbd38ee5a0",
                        "name": "Secrets Store Read",
                        "description": "Grants read access to Secrets Store",
                        "scopes": [
                            "com.cloudflare.api.account"
                        ]
                    },
                    {
                        "id": "adc8fa2bc6124928a8b3314dc63a1235",
                        "name": "Secrets Store Write",
                        "description": "Grants write access to Secrets Store",
                        "scopes": [
                            "com.cloudflare.api.account"
                        ]
                    },
                    {
                        "id": "a92d2450e05d4e7bb7d0a64968f83d11",
                        "name": "Workers AI Read",
                        "description": "Grants access to invoke Workers AI models",
                        "scopes": [
                            "com.cloudflare.api.account"
                        ]
                    },
                    {
                        "id": "bacc64e0f6c34fc0883a1223f938a104",
                        "name": "Workers AI Write",
                        "description": "Grants access to invoke Workers AI models and edit assets",
                        "scopes": [
                            "com.cloudflare.api.account"
                        ]
                    },
                    {
                        "id": "192192df92ee43ac90f2aeeffce67e35",
                        "name": "D1 Read",
                        "description": "Grants read access to D1 configuration and SQL queries",
                        "scopes": [
                            "com.cloudflare.api.account"
                        ]
                    },
                    {
                        "id": "09b2857d1c31407795e75e3fed8617a1",
                        "name": "D1 Write",
                        "description": "Grants write access to D1 configuration and SQL queries",
                        "scopes": [
                            "com.cloudflare.api.account"
                        ]
                    },
                    {
                        "id": "1a71c399035b4950a1bd1466bbe4f420",
                        "name": "Workers Scripts Read",
                        "description": "Grants read access to Cloudflare Workers scripts",
                        "scopes": [
                            "com.cloudflare.api.account"
                        ]
                    },
                    {
                        "id": "e086da7e2179491d91ee5f35b3ca210a",
                        "name": "Workers Scripts Write",
                        "description": "Grants write access to Cloudflare Workers scripts",
                        "scopes": [
                            "com.cloudflare.api.account"
                        ]
                    },
                    {
                        "id": "2072033d694d415a936eaeb94e6405b8",
                        "name": "Workers Routes Read",
                        "description": "Grants read access to Cloudflare Workers and Workers KV Storage",
                        "scopes": [
                            "com.cloudflare.api.account.zone"
                        ]
                    },
                    {
                        "id": "28f4b596e7d643029c524985477ae49a",
                        "name": "Workers Routes Write",
                        "description": "Grants write access to Cloudflare Workers and Workers KV Storage",
                        "scopes": [
                            "com.cloudflare.api.account.zone"
                        ]
                    },
                    {
                        "id": "8acbe5bb0d54464ab867149d7f7cf8ac",
                        "name": "User Details Read"
                    },
                    {
                        id: 'e6d2666161e84845a636613608cee8d5',
                        name: 'Zone Write',
                        description: 'Grants write access to zone management',
                        scopes: ['com.cloudflare.api.account.zone']
                    },
                    {
                        id: 'c8fed203ed3043cba015a93ad1616f1f',
                        name: 'Zone Read',
                        description: 'Grants read access to zone management',
                        scopes: ['com.cloudflare.api.account.zone']
                    },
                    {
                        id: 'ad99c5ae555e45c4bef5bdf2678388ba',
                        name: 'Workers CI Read',
                        description: 'Grants read access to Workers CI',
                        scopes: ['com.cloudflare.api.account']
                    },
                    {
                        id: '2e095cf436e2455fa62c9a9c2e18c478',
                        name: 'Workers CI Write',
                        description: 'Grants write access to Workers CI',
                        scopes: ['com.cloudflare.api.account']
                    },
                ]
            }
        ]
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Erro ao criar Deployer Token:", data);
            return null;
        }

        return data?.result || null;

    } catch (error) {
        console.error("Erro na requisição:", error);
        return null;
    }
}
