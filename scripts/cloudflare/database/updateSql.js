const updateSql = `
ALTER TABLE config ADD COLUMN default_language TEXT NOT NULL DEFAULT 'pt-BR';
ALTER TABLE config ADD COLUMN enabled_languages TEXT NOT NULL DEFAULT '["pt-BR"]' CHECK(json_valid(enabled_languages));
`
export default updateSql;