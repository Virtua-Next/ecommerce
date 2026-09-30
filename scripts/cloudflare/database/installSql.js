const installSql = ` 
-- Drop tables in correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS tb_image;
DROP TABLE IF EXISTS order_item;
DROP TABLE IF EXISTS payment;
DROP TABLE IF EXISTS tb_order;
DROP TABLE IF EXISTS tb_address;
DROP TABLE IF EXISTS user;

DROP TABLE IF EXISTS profile_translation;
DROP TABLE IF EXISTS tb_profile;

DROP TABLE IF EXISTS price;

DROP TABLE IF EXISTS product_translation;
DROP TABLE IF EXISTS product;

DROP TABLE IF EXISTS product_image;

DROP TABLE IF EXISTS payment_method_translation;
DROP TABLE IF EXISTS payment_method;

DROP TABLE IF EXISTS payment_api_translation;
DROP TABLE IF EXISTS payment_api;

DROP TABLE IF EXISTS category_translation;
DROP TABLE IF EXISTS category;

DROP TABLE IF EXISTS brand_translation;
DROP TABLE IF EXISTS brand;

DROP TABLE IF EXISTS trigger_email;
DROP TABLE IF EXISTS email_api;

DROP TABLE IF EXISTS carrier_translation;
DROP TABLE IF EXISTS carrier;
DROP TABLE IF EXISTS carrier_country;

DROP TABLE IF EXISTS page_translation;
DROP TABLE IF EXISTS tb_page;

DROP TABLE IF EXISTS metadata_translation;
DROP TABLE IF EXISTS metadata;

DROP TABLE IF EXISTS footer_translation;
DROP TABLE IF EXISTS footer;

DROP TABLE IF EXISTS slide_translation;
DROP TABLE IF EXISTS slide;

DROP TABLE IF EXISTS config_translation;
DROP TABLE IF EXISTS config;

DROP TABLE IF EXISTS licence_cache;

-- =====================================================
-- 1. LICENCE CACHE
-- =====================================================
CREATE TABLE IF NOT EXISTS licence_cache (
    id INTEGER PRIMARY KEY,
    token TEXT NOT NULL
);

-- =====================================================
-- 2. CONFIG
-- =====================================================
CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    light_logo TEXT,
    dark_logo TEXT,
    favicon TEXT,
    cdn TEXT,
    google_analytics TEXT,
    contact_phone TEXT,
    whatsapp TEXT,
    products_per_row INTEGER NOT NULL DEFAULT 4,
    products_per_page INTEGER NOT NULL DEFAULT 12,
    show_price BOOLEAN NOT NULL DEFAULT 1 CHECK(show_price IN (0, 1)),
    in_store_pickup BOOLEAN NOT NULL DEFAULT 1 CHECK(in_store_pickup IN (0, 1)),
    new_address_checkout BOOLEAN NOT NULL DEFAULT 1 CHECK(new_address_checkout IN (0, 1)),
    maintenance BOOLEAN NOT NULL DEFAULT 0 CHECK(maintenance IN (0, 1)),
    theme TEXT DEFAULT 'theme-pastel'
);

insert into config (domain) values ('localhost');

CREATE TABLE IF NOT EXISTS config_translation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_id INTEGER NOT NULL,
    translation_language TEXT NOT NULL,
    site_name TEXT,
    site_description TEXT,
    FOREIGN KEY (config_id) REFERENCES config(id) ON DELETE CASCADE,
    UNIQUE(config_id, translation_language)
);

-- =====================================================
-- 3. SLIDE
-- =====================================================
CREATE TABLE IF NOT EXISTS slide (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slide_image TEXT NOT NULL,
    title_color TEXT,
    subtitle_color TEXT,
    button_text_color TEXT,
    button_background TEXT,
    button_border TEXT,
    button_link TEXT,
    slide_location TEXT NOT NULL CHECK (json_valid(slide_location)),
    slide_order INTEGER DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT 1 CHECK(active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS slide_translation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slide_id INTEGER NOT NULL,
    translation_language TEXT NOT NULL,
    title TEXT,
    subtitle TEXT,
    button_text TEXT,
    FOREIGN KEY (slide_id) REFERENCES slide(id) ON DELETE CASCADE,
    UNIQUE(slide_id, translation_language)
);

INSERT INTO slide (slide_image, title_color, subtitle_color, button_text_color, button_background, button_link, slide_order, active, slide_location) 
VALUES('/images/slide-example-1.svg', NULL, '#FFFFFF', '#FFFFFF', '#2563EB', '#', 0, 1, json('["home", "brand"]'));

INSERT INTO slide (slide_image, title_color, subtitle_color, button_text_color, button_background, button_link, slide_order, active, slide_location) 
VALUES('/images/slide-example-2.svg', '#FFFF00', '#FFFF00', '#FFFFFF', '#2563EB', '#', 1, 1, json('["home", "category"]'));

INSERT INTO slide (slide_image, title_color, subtitle_color, button_text_color, button_background, button_link, slide_order, active, slide_location)
VALUES('/images/slide-example-3.svg',  NULL, '#FFFFFF', '#FFFFFF', '#2563EB', '#', 2, 1, json('["home", "page", "product"]'));

INSERT INTO slide_translation (slide_id, translation_language, title, subtitle, button_text) VALUES
(1, 'en-US', 'Sometimes Thats All We Need', 'A beautiful place in nature to enjoy and relax', 'Learn More'),
(1, 'pt-BR', 'Às Vezes é Só Isso que Precisamos', 'Um lindo lugar na natureza para aproveitar e relaxar', 'Saiba Mais'),
(2, 'en-US', 'No Matter Where You Go', 'Always carry truth and freedom with you', 'Check It Out'),
(2, 'pt-BR', 'Não Importa Onde Você Vá', 'Sempre carregue a verdade e a liberdade com você', 'Confira'),
(3, 'en-US', 'Our Happiest Moments Are Often', 'Simple things done with those we love', 'Learn More'),
(3, 'pt-BR', 'Nossos Momentos Mais Felizes São Frequentemente', 'Coisas simples feitas com aqueles que amamos', 'Saiba Mais');


-- =====================================================
-- 4. FOOTER
-- =====================================================
CREATE TABLE IF NOT EXISTS footer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    footer_type TEXT NOT NULL,
    footer_order INTEGER DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT 1 CHECK(active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS footer_translation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    footer_id INTEGER NOT NULL,
    translation_language TEXT NOT NULL,
    title TEXT,
    content TEXT,
    FOREIGN KEY (footer_id) REFERENCES footer(id) ON DELETE CASCADE,
    UNIQUE(footer_id, translation_language)
);

INSERT INTO footer (footer_type, footer_order, active) VALUES
('links', 1, 1),
('schedule', 3, 1),
('social_media', 4, 1),
('contact', 2, 1);

INSERT INTO footer_translation (footer_id, translation_language, title, content) VALUES
(1, 'en-US', 'Online Shopping', '[{"text":"Presidente Prudente S.P","url":"#","icon":"MapPin"}]'),
(1, 'pt-BR', 'Compras Online', '[{"text":"Presidente Prudente S.P","url":"#","icon":"MapPin"}]'),
(2, 'en-US', 'Business Hours', '[{"days":"Mon-Fri","hours":"9am to 6pm","icon":"Clock"},{"days":"Sat","hours":"9am to 1pm","icon":"Clock"}]'),
(2, 'pt-BR', 'Horário de Funcionamento', '[{"days":"Seg-Sex","hours":"9h às 18h","icon":"Clock"},{"days":"Sáb","hours":"9h às 13h","icon":"Clock"}]'),
(3, 'en-US', 'Social Media', '[{"name":"Facebook","icon":"Facebook","url":"https://facebook.com"},{"name":"Instagram","icon":"Instagram","url":"https://instagram.com"}]'),
(3, 'pt-BR', 'Redes Sociais', '[{"name":"Facebook","icon":"Facebook","url":"https://facebook.com"},{"name":"Instagram","icon":"Instagram","url":"https://instagram.com"}]'),
(4, 'en-US', 'Contact', '[{"text":"(18) 99123 - 4567","icon":"Phone","link":""},{"text":"contact@onlinestore.com","icon":"Envelope","link":""}]'),
(4, 'pt-BR', 'Contato', '[{"text":"(18) 99123 - 4567","icon":"Phone","link":""},{"text":"contato@lojaonline.com","icon":"Envelope","link":""}]');


-- =====================================================
-- 5. METADATA
-- =====================================================
CREATE TABLE IF NOT EXISTS metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    robots_directive TEXT,
    og_image TEXT,
    x_image TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    target_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    UNIQUE(target_type, target_id)
);

CREATE TABLE IF NOT EXISTS metadata_translation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metadata_id INTEGER NOT NULL,
    translation_language TEXT NOT NULL,
    title TEXT,
    metadata_description TEXT,
    keywords TEXT,
    og_title TEXT,
    og_description TEXT,
    x_title TEXT,
    x_description TEXT,
    FOREIGN KEY (metadata_id) REFERENCES metadata(id) ON DELETE CASCADE,
    UNIQUE(metadata_id, translation_language)
);

INSERT INTO metadata (target_type, target_id) VALUES ('config', 1);

INSERT INTO metadata_translation (metadata_id, translation_language, title, metadata_description, keywords, og_title, og_description) VALUES
(1, 'en-US', 'My Awesome Store', 'The best online store', 'store, online, shopping', 'My Awesome Store', 'The best online store'),
(1, 'pt-BR', 'Minha Loja Incrível', 'A melhor loja online', 'loja, online, compras', 'Minha Loja Incrível', 'A melhor loja online');

-- =====================================================
-- 6. PAGE
-- =====================================================
CREATE TABLE IF NOT EXISTS tb_page (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_image TEXT,
    page_order INTEGER DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT 1 CHECK(active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS page_translation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL,
    translation_language TEXT NOT NULL,
    slug TEXT,
    title TEXT,
    page_description TEXT,
    content TEXT,
    FOREIGN KEY (page_id) REFERENCES tb_page(id) ON DELETE CASCADE,
    UNIQUE(page_id, translation_language),
    UNIQUE(translation_language, slug)
);

INSERT INTO tb_page (page_order, active) VALUES (0, 1);

INSERT INTO page_translation (page_id, translation_language, slug, title, page_description, content) VALUES
(1, 'en-US', 'example-page', 'Just an example page', 'This is just an example page', '<h1>Example Content</h1><p>This is content created in the admin panel.</p>'),
(1, 'pt-BR', 'pagina-de-exemplo', 'Apenas uma página de exemplo', 'Esta é apenas uma página de exemplo', '<h1>Conteúdo Exemplo</h1><p>Este é um conteúdo criado no painel administrativo.</p>');

-- =====================================================
-- 7. CARRIER
-- =====================================================
CREATE TABLE IF NOT EXISTS carrier (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key TEXT DEFAULT NULL,
    refresh_token TEXT DEFAULT NULL,
    origin_zip TEXT DEFAULT NULL,
    free_shipping BOOLEAN NOT NULL DEFAULT 0 CHECK(free_shipping IN (0, 1)),
    free_shipping_from REAL DEFAULT 0,
    price REAL NOT NULL DEFAULT 0,
    carrier_type TEXT NOT NULL,  -- É a INTEGRAÇÃO, não a transportadora que entrega: 'personalized' | 'correios' | 'melhor_envio'. Com melhor_envio, quem entrega (Jadlog, Correios...) varia por cotação e fica em tb_order.shipping_carrier_name / shipping_service.
    carrier_service TEXT DEFAULT NULL, -- Serviço padrão da integração (ex.: '.Package' nos Correios). Para melhor_envio o serviço real vem da cotação e é gravado no pedido, não aqui.
    client_id TEXT DEFAULT NULL,
    client_secret TEXT DEFAULT NULL,
    token_expires_at DATETIME DEFAULT NULL,
    calculation_method TEXT,  -- 'api' (cotação online) | 'fixed' (preço fixo em 'price')
    active BOOLEAN NOT NULL DEFAULT 1 CHECK(active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS carrier_translation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    carrier_id INTEGER NOT NULL,
    translation_language TEXT NOT NULL,
    carrier_name TEXT, -- Nome da INTEGRAÇÃO exibido no admin/checkout (ex.: 'Privada', 'Melhor Envio'). NÃO usar em emails de rastreio: lá use tb_order.shipping_carrier_name (ex.: 'Jadlog').
    FOREIGN KEY (carrier_id) REFERENCES carrier(id) ON DELETE CASCADE,
    UNIQUE(carrier_id, translation_language)
);

CREATE TABLE IF NOT EXISTS carrier_country (
    carrier_id INTEGER NOT NULL,
    country_code TEXT NOT NULL, -- ISO 3166-1 alpha-2 em MAIÚSCULO ('BR', 'US', 'PT'). Precisa ser o mesmo formato que o endereço do cliente grava.
    PRIMARY KEY (carrier_id, country_code),
    FOREIGN KEY (carrier_id) REFERENCES carrier(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_carrier_country_code ON carrier_country(country_code);

INSERT INTO carrier (free_shipping, free_shipping_from, price, carrier_type, calculation_method, active) 
VALUES (1, 200.00, 35.00, 'personalized', 'fixed', 1);

INSERT INTO carrier_translation (carrier_id, translation_language, carrier_name) VALUES
(1, 'en-US', 'Private Carrier'),
(1, 'pt-BR', 'Transportadora Privada');

-- =====================================================
-- 8. EMAIL API
-- =====================================================
CREATE TABLE IF NOT EXISTS email_api (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_server TEXT NOT NULL,
    api_key TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT 1 CHECK(active IN (0, 1))
);

-- =====================================================
-- 9. TRIGGER EMAIL
-- =====================================================
CREATE TABLE IF NOT EXISTS trigger_email (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trigger_type TEXT NOT NULL, -- account, sales, support
    email TEXT NOT NULL,
    api_id INTEGER,
    active BOOLEAN NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    FOREIGN KEY (api_id) REFERENCES email_api(id) ON DELETE CASCADE
);

-- =====================================================
-- 10. BRAND
-- =====================================================
CREATE TABLE IF NOT EXISTS brand (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_image TEXT,
    active BOOLEAN NOT NULL DEFAULT 1 CHECK(active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS brand_translation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_id INTEGER NOT NULL,
    translation_language TEXT NOT NULL,
    title TEXT,
    brand_description TEXT,
    slug TEXT,
    FOREIGN KEY (brand_id) REFERENCES brand(id) ON DELETE CASCADE,
    UNIQUE(brand_id, translation_language),
    UNIQUE(translation_language, slug)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_translation_brand_lang ON brand_translation (brand_id, translation_language);

INSERT INTO brand (active) VALUES (1);

INSERT INTO brand_translation (brand_id, translation_language, title, brand_description, slug) VALUES
(1, 'en-US', 'No Brand', 'Default brand', 'no-brand'),
(1, 'pt-BR', 'Sem Marca', 'Marca Padrão', 'sem-marca');

-- =====================================================
-- 11. CATEGORY
-- =====================================================
CREATE TABLE IF NOT EXISTS category (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_image TEXT,
    active BOOLEAN NOT NULL DEFAULT 1 CHECK(active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS category_translation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    translation_language TEXT NOT NULL,
    title TEXT,
    category_description TEXT,
    slug TEXT,
    FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE CASCADE,
    UNIQUE(category_id, translation_language),
    UNIQUE(translation_language, slug)
);

INSERT INTO category (active) VALUES (1);

INSERT INTO category_translation (category_id, translation_language, title, category_description, slug) VALUES
(1, 'en-US', 'Uncategorized', 'Default category', 'uncategorized'),
(1, 'pt-BR', 'Sem Categoria', 'Categoria Padrão', 'sem-categoria');

-- =====================================================
-- 12. PRODUCT
-- =====================================================
CREATE TABLE IF NOT EXISTS product (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT NOT NULL UNIQUE,
    cost_price REAL NOT NULL DEFAULT 0 CHECK(cost_price >= 0),
    price REAL NOT NULL DEFAULT 0 CHECK(price >= 0),
    promotional_price REAL DEFAULT NULL CHECK(promotional_price IS NULL OR promotional_price >= 0),
    stock INTEGER DEFAULT 0 CHECK(stock IS NULL OR stock >= 0),
    product_length REAL DEFAULT NULL CHECK(product_length IS NULL OR product_length > 0),
    width REAL DEFAULT NULL CHECK(width IS NULL OR width > 0),
    height REAL DEFAULT NULL CHECK(height IS NULL OR height > 0),
    product_weight REAL DEFAULT NULL CHECK(product_weight IS NULL OR product_weight > 0),
    active BOOLEAN NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    category_id INTEGER NOT NULL DEFAULT 1,
    brand_id INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE SET DEFAULT,
    FOREIGN KEY (brand_id) REFERENCES brand(id) ON DELETE SET DEFAULT
);

CREATE TABLE IF NOT EXISTS product_translation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    translation_language TEXT NOT NULL,
    title TEXT,
    slug TEXT,
    product_description TEXT,
    specification TEXT,
    FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE,
    UNIQUE(product_id, translation_language),
    UNIQUE(translation_language, slug)
);

-- =====================================================
-- 13. PRODUCT IMAGE
-- =====================================================
CREATE TABLE IF NOT EXISTS product_image (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_path TEXT NOT NULL,
    image_order INTEGER DEFAULT 0,
    image_primary BOOLEAN NOT NULL DEFAULT 0 CHECK(image_primary IN (0, 1)),
    product_id INTEGER NOT NULL,
    FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE
);

-- 1. SKU único por produto (cada produto tem um SKU distinto)
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_sku_unique ON product (sku);
-- 2. Uma tradução por (produto, idioma) — evita duplicatas de translation
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_translation_unique ON product_translation (product_id, translation_language);
-- 3. Slug único POR idioma (o mesmo slug pode existir em locales diferentes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_translation_slug_locale_unique ON product_translation (translation_language, slug);
-- 4. Uma imagem primária por produto (regra de negócio: 1 primary)
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_image_primary_unique ON product_image (product_id) WHERE image_primary = 1;
-- 5. Ordem de imagem única por produto (evita duas imagens com image_order=0)
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_image_order_unique ON product_image (product_id, image_order);
-- 6. Filtro + ordenação da listagem admin (active DESC, title ASC)
--    O SQLite pode usar esse índice para o WHERE e o ORDER BY
CREATE INDEX IF NOT EXISTS idx_product_active ON product (active DESC, id);
-- 7. JOIN de tradução por idioma (usado em toda query com locale)
--    Já coberto em parte pelo unique #2, mas reforçamos com o slug
CREATE INDEX IF NOT EXISTS idx_product_translation_lookup ON product_translation (product_id, translation_language, slug, title);
-- 8. Busca por SKU com LIKE (prefixo)
CREATE INDEX IF NOT EXISTS idx_product_sku ON product (sku);
-- 9. Filtro por categoria/marca (usado em listagens públicas e filtros)
CREATE INDEX IF NOT EXISTS idx_product_category_id ON product (category_id);
CREATE INDEX IF NOT EXISTS idx_product_brand_id ON product (brand_id);
-- 10. Lookup de imagens por produto (usado no json_group_array)
CREATE INDEX IF NOT EXISTS idx_product_image_product_id ON product_image (product_id);


INSERT INTO product (sku, cost_price, price, stock, active, category_id, brand_id) 
VALUES('000001', 49.99, 99.99, 100, 1, 1, 1);

INSERT INTO product_translation (product_id, translation_language, title, slug, product_description, specification) VALUES
(1, 'en-US', 'Example Product', 'example-product', 'Just an example product', 'Example product specifications'),
(1, 'pt-BR', 'Produto Exemplo', 'produto-exemplo', 'Apenas um produto de exemplo', 'Especificações de produto de exemplo');

-- =====================================================
-- 14. PROFILE
-- =====================================================
CREATE TABLE IF NOT EXISTS tb_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    active BOOLEAN NOT NULL DEFAULT 1 CHECK(active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS profile_translation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER NOT NULL,
    translation_language TEXT NOT NULL,
    profile_description TEXT,
    FOREIGN KEY (profile_id) REFERENCES tb_profile(id) ON DELETE CASCADE,
    UNIQUE(profile_id, translation_language)
);

INSERT INTO tb_profile (active) VALUES (1), (1);

INSERT INTO profile_translation (profile_id, translation_language, profile_description) VALUES
(1, 'en-US', 'Administrator'),
(1, 'pt-BR', 'Administrador'),
(2, 'en-US', 'Customer'),
(2, 'pt-BR', 'Cliente');

-- =====================================================
-- 15. USER
-- =====================================================
CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL,
    user_name TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'BR', -- 'BR', 'US'

    -- tax_id: Documento fiscal do usuário. Formato varia por país:
    --   BR: CPF (11 dígitos) ou CNPJ (14 dígitos)
    --   US: SSN ou EIN (9 dígitos)
    --   PT: NIF (9 dígitos)
    tax_id TEXT CHECK(tax_id IS NULL OR length(trim(tax_id)) BETWEEN 5 AND 20),

    email TEXT NOT NULL UNIQUE,
    phone TEXT CHECK(phone IS NULL OR (length(trim(phone)) >= 8 AND length(trim(phone)) <= 20)),
    user_password TEXT NOT NULL CHECK(length(user_password) >= 8),
    active BOOLEAN NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    profile_id INTEGER NOT NULL DEFAULT 2,
    preferred_language TEXT DEFAULT 'pt-BR',
    FOREIGN KEY (profile_id) REFERENCES tb_profile(id) ON DELETE SET DEFAULT
);

-- Unicidade do documento fiscal por país (não global), aplicada só quando preenchido
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tax_id_country ON user(country, tax_id) WHERE tax_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_phone ON user(phone) WHERE phone IS NOT NULL;

-- =====================================================
-- 16. ADDRESS
-- =====================================================
CREATE TABLE IF NOT EXISTS tb_address (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    country_code TEXT NOT NULL DEFAULT 'BR',
    -- Código postal. Formato varia por país:
    --   BR: CEP (8 dígitos, usado para busca automática via ViaCEP)
    --   US: ZIP Code
    --   PT: Código Postal
    zip TEXT NOT NULL,

    street TEXT NOT NULL,
    address_number TEXT NOT NULL,
    complement TEXT,

    -- Bairro. Só utilizado/exibido para endereços do Brasil (BR);
    -- US e PT não possuem esse nível de subdivisão no formulário e deixam NULL.
    neighborhood TEXT,

    city TEXT NOT NULL,

    -- Subdivisão administrativa do endereço. Significado varia por país:
    --   BR: Estado (sigla UF, 2 letras)
    --   US: State (sigla, 2 letras)
    --   PT: Distrito
    address_state TEXT NOT NULL,

    address_primary BOOLEAN NOT NULL DEFAULT 1 CHECK(address_primary IN (0, 1)),
    user_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX idx_one_primary_per_user ON tb_address(user_id) WHERE address_primary = 1;
CREATE INDEX IF NOT EXISTS idx_address_country ON tb_address(country_code);

-- =====================================================
-- 17. PAYMENT API
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_api (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_provider TEXT NOT NULL,          -- 'stripe' | 'mercadopago'. Pagamentos offline NÃO têm linha aqui
    public_key TEXT NOT NULL,
    private_key TEXT NOT NULL,           -- accessToken no Mercado Pago
    webhook TEXT,
    webhook_secret TEXT,                 -- webhookSignature no Mercado Pago
    webhook_id TEXT,
    account_id TEXT,
    supports_installments BOOLEAN NOT NULL DEFAULT 0 CHECK(supports_installments IN (0, 1)),
    active BOOLEAN NOT NULL DEFAULT 1 CHECK(active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS payment_api_translation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_api_id INTEGER NOT NULL,
    translation_language TEXT NOT NULL,
    title TEXT,
    FOREIGN KEY (payment_api_id) REFERENCES payment_api(id) ON DELETE CASCADE,
    UNIQUE(payment_api_id, translation_language)
);

INSERT INTO payment_api (api_provider, public_key, private_key) 
VALUES ('offline', '', '');

INSERT INTO payment_api_translation (payment_api_id, translation_language, title) VALUES
(1, 'en-US', 'Offline Payment'),
(1, 'pt-BR', 'Pagamento Offline');

-- =====================================================
-- 18. PAYMENT METHOD
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_method (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    method_type TEXT NOT NULL, -- Instrumento REAL: card | pix | boleto | transfer | cash. Uma linha por (api_id, method_type). Ex.: Mercado Pago tem 3 linhas (card, pix, boleto). No checkout a escolha do cliente (cardData / pixData / ticketData) define o valor, e ele é gravado direto em tb_order.payment_method.
    account_data TEXT,                   -- Dados para métodos offline (chave Pix, conta bancária, instruções)
    api_id INTEGER NOT NULL,
    installment_sale BOOLEAN NOT NULL DEFAULT 1 CHECK(installment_sale IN (0, 1)),
    max_installments INTEGER DEFAULT 1,
    active BOOLEAN NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    discount_percent REAL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100), -- DESCONTO em % (0 a 100) para este método. Aplicado só quando o gateway não cobra nada por cima do valor enviado (Pix, boleto). No cartão deixe 0: o juros do parcelado é do gateway. Validar a faixa 0-100 na aplicação. Antes desta versão a coluna se chamava 'fee' (acréscimo).
    icon TEXT,
    FOREIGN KEY (api_id) REFERENCES payment_api(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payment_method_translation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_method_id INTEGER NOT NULL,
    translation_language TEXT NOT NULL,
    title TEXT,
    method_description TEXT,
    FOREIGN KEY (payment_method_id) REFERENCES payment_method(id) ON DELETE CASCADE,
    UNIQUE(payment_method_id, translation_language)
);

-- =====================================================
-- 19. ORDER
-- =====================================================
CREATE TABLE IF NOT EXISTS tb_order (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    order_status TEXT NOT NULL, -- 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'canceled', 'archived', 'payment_error', 'refunded'. Ciclo de vida do pedido. NÃO é o status do pagamento (esse fica em payment.payment_status).
    payment_method TEXT NOT NULL, -- Instrumento escolhido no checkout: 'card' | 'pix' | 'boleto' | 'cash' | 'transfer'. Gravado já na criação do pedido, a partir do payload. NÃO é um valor provisório: 'card' significa que o cliente escolheu cartão. Ver payment.method para o método confirmado pelo gateway (pode distinguir crédito/débito).
    installments INTEGER NOT NULL DEFAULT 1 CHECK(installments >= 1),
    delivery_option TEXT NOT NULL,
    products_value REAL NOT NULL CHECK(products_value >= 0), -- Soma dos produtos, sem frete, sem desconto, sem juros.
    shipping_value REAL NOT NULL DEFAULT 0 CHECK(shipping_value >= 0),
    discount_value REAL NOT NULL DEFAULT 0 CHECK(discount_value >= 0), -- Desconto em R$ concedido pelo método de pagamento (payment_method.discount_percent). Já subtraído de base_value.
    base_value REAL NOT NULL CHECK(base_value >= 0), -- VALOR ENVIADO AO GATEWAY = products_value + shipping_value - discount_value. É o valor-base: sem juros de cartão. Sempre enviar este valor ao Mercado Pago/Stripe.
    interest REAL DEFAULT NULL CHECK(interest IS NULL OR interest >= 0), -- Juros do parcelamento em R$ = total_value - base_value. Apenas para relatórios; quem cobra e calcula é o gateway. NULL quando não há parcelamento com juros.
    total_value REAL NOT NULL CHECK(total_value >= 0), -- VALOR QUE O CLIENTE PAGOU = base_value + juros. Sem juros, total_value = base_value. Ao validar webhook, compare o valor pago com este campo.
    observations TEXT,
    tracking TEXT, -- Código de rastreio
    shipping_zip TEXT,
    shipping_street TEXT,
    shipping_number TEXT,
    shipping_complement TEXT,
    shipping_neighborhood TEXT,
    shipping_city TEXT,
    shipping_state TEXT,
    shipping_carrier_name TEXT, -- Transportadora REAL que entrega (ex.: 'Jadlog', 'Correios'), gravada da cotação. carrier_id aponta só para a INTEGRAÇÃO (ex.: Melhor Envio). Use ESTE campo no email de rastreio.
    shipping_service TEXT, -- Serviço da transportadora (ex.: '.Package', 'PAC', 'SEDEX').
    user_id INTEGER,
    address_id INTEGER,
    api_id INTEGER,  -- Integração de pagamento usada. NULL = pagamento offline
    carrier_id INTEGER, -- Integração de frete (ex.: melhor_envio), não a transportadora final
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL,
    FOREIGN KEY (address_id) REFERENCES tb_address(id) ON DELETE SET NULL,
    FOREIGN KEY (api_id) REFERENCES payment_api(id) ON DELETE SET NULL,
    FOREIGN KEY (carrier_id) REFERENCES carrier(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_order_user_id ON tb_order(user_id);
CREATE INDEX IF NOT EXISTS idx_order_status ON tb_order(order_status);

-- =====================================================
-- 20. ORDER ITEMS
-- =====================================================
CREATE TABLE IF NOT EXISTS order_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    price REAL NOT NULL CHECK(price >= 0),
    cost_price REAL NOT NULL CHECK(cost_price >= 0),
    order_id INTEGER,
    product_id INTEGER,
    FOREIGN KEY (order_id) REFERENCES tb_order(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_order_item_order_id ON order_item(order_id);

-- =====================================================
-- 21. PAYMENT
-- =====================================================
CREATE TABLE IF NOT EXISTS payment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    api_provider TEXT NOT NULL, -- 'stripe' | 'mercadopago' | 'offline'
    method TEXT NOT NULL, -- Método REAL confirmado pelo gateway (pix, boleto, card...). Pode corrigir tb_order.payment_method, que é só o que o cliente escolheu no checkout.
    payment_status TEXT NOT NULL, -- Status NORMALIZADO da aplicação: pending | paid | failed | canceled | refunded. Use este campo em toda regra de negócio.
    amount REAL NOT NULL CHECK(amount >= 0), -- Valor-base enviado ao gateway (igual a tb_order.base_value). NÃO inclui juros de cartão.
    external_id TEXT UNIQUE, -- Id da transação no gateway (no Mercado Pago é o id da ORDER, 'ORD...'). UNIQUE evita processar o mesmo webhook duas vezes. NULL em pagamentos offline (vários NULL são permitidos).
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Quando o REGISTRO foi criado, e não quando foi pago (ver paid_at).
    gateway_status TEXT, -- Status ORIGINAL do gateway (ex.: 'processed'). Só depuração, nunca em regra de negócio.
    paid_at TIMESTAMP, -- Momento em que o pagamento foi confirmado. NULL enquanto não pago.
    charged_amount REAL CHECK(charged_amount IS NULL OR charged_amount >= 0),  -- O que o cliente REALMENTE pagou, com juros de cartão. juros = charged_amount - amount.
    installments INTEGER NOT NULL DEFAULT 1 CHECK(installments >= 1),
    api_id INTEGER REFERENCES payment_api(id) ON DELETE SET NULL, -- Credencial que processou. NULL = offline. Complementa api_provider (texto).
    FOREIGN KEY (order_id) REFERENCES tb_order(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_payment_order ON payment(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payment(payment_status);
`
export default installSql;
