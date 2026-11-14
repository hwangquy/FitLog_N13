-- FitLog AI Vector: run AFTER ai_features.sql, on MariaDB 11.7.1+ (11.8 LTS recommended).
-- Do NOT run V1__schema.sql again on an existing fitlog_db.
-- Data + embeddings are stored persistently in MariaDB, no Qdrant required.
USE fitlog_db;

CREATE TABLE IF NOT EXISTS ai_knowledge_vectors (
    knowledge_id VARCHAR(36) NOT NULL PRIMARY KEY,
    embedding VECTOR(1024) NOT NULL,
    model_name VARCHAR(64) NOT NULL DEFAULT 'bge-m3',
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_ai_vector_knowledge
        FOREIGN KEY (knowledge_id) REFERENCES ai_knowledge(id) ON DELETE CASCADE,
    VECTOR INDEX (embedding) M=8 DISTANCE=cosine
) ENGINE=InnoDB;

-- IMPORTANT: Vector values are populated by Admin > AI Knowledge > Reindex
-- (Ollama /api/embed, model bge-m3); no SQL-only fake embeddings are inserted.

-- Sanity checks after reindex:
-- SELECT COUNT(*) FROM ai_knowledge;
-- SELECT COUNT(*) FROM ai_knowledge_vectors;
-- SELECT knowledge_id, model_name, VEC_ToText(embedding) FROM ai_knowledge_vectors LIMIT 1;
