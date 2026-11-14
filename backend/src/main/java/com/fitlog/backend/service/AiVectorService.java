package com.fitlog.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;

/**
 * Ollama BGE-M3 creates 1024-dimensional embeddings.
 * MariaDB 11.7.1+ stores vectors durably (no Qdrant, no in-memory index).
 */
@Service
public class AiVectorService {
    private static final int DIMENSIONS = 1024;
    private final JdbcTemplate db;
    private final ObjectMapper json;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5)).build();

    @Value("${fitlog.ai.ollama-embed-url:http://localhost:11434/api/embed}")
    private String embedUrl;

    @Value("${fitlog.ai.embedding-model:bge-m3}")
    private String embeddingModel;

    // Tune with real evaluation examples; do not treat this as universal semantic truth.
    @Value("${fitlog.ai.min-vector-similarity:0.45}")
    private double minSimilarity;

    public AiVectorService(JdbcTemplate db, ObjectMapper json) {
        this.db = db;
        this.json = json;
    }

    private String embed(String text) {
        try {
            ObjectNode input = json.createObjectNode();
            input.put("model", embeddingModel);
            input.put("input", text);

            HttpRequest request = HttpRequest.newBuilder(URI.create(embedUrl))
                    .timeout(Duration.ofSeconds(60))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(input.toString()))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "Ollama embedding HTTP " + response.statusCode());
            }
            JsonNode embedding = json.readTree(response.body()).path("embeddings").path(0);
            if (!embedding.isArray() || embedding.size() != DIMENSIONS) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "BGE-M3 phải trả về vector 1024 chiều.");
            }
            ArrayNode safeVector = json.createArrayNode();
            for (JsonNode component : embedding) {
                if (!component.isNumber() || !Double.isFinite(component.asDouble())) {
                    throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                            "Embedding chứa phần tử không hợp lệ.");
                }
                safeVector.add(component.asDouble());
            }
            return safeVector.toString();
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Không truy cập được Ollama BGE-M3 tại " + embedUrl, ex);
        }
    }

    /** The ai_knowledge row must already exist (FK); caller can wrap both inserts in a transaction. */
    public void index(String id, String title, String category, String content, String source) {
        String embeddingJson = embed(title + "\n" + content);
        db.update("""
                INSERT INTO ai_knowledge_vectors (knowledge_id, embedding, model_name, updated_at)
                VALUES (?, VEC_FromText(?), ?, UTC_TIMESTAMP(6))
                ON DUPLICATE KEY UPDATE
                    embedding = VALUES(embedding),
                    model_name = VALUES(model_name),
                    updated_at = UTC_TIMESTAMP(6)
                """, id, embeddingJson, embeddingModel);
    }

    public String search(String text) {
        String queryVector = embed(text);
        // Query only the vector table first, so the cosine index can be used:
        // ORDER BY VEC_DISTANCE_COSINE(column, query) LIMIT ...
        List<Hit> hits = db.query("""
                SELECT knowledge_id,
                       VEC_DISTANCE_COSINE(embedding, VEC_FromText(?)) AS distance
                FROM ai_knowledge_vectors
                WHERE model_name = ?
                ORDER BY VEC_DISTANCE_COSINE(embedding, VEC_FromText(?))
                LIMIT 3
                """, (rs, rowNum) -> new Hit(rs.getString("knowledge_id"),
                    rs.getDouble("distance")),
                queryVector, embeddingModel, queryVector);

        StringBuilder context = new StringBuilder();
        for (Hit hit : hits) {
            double similarity = 1.0 - hit.distance(); // cosine DISTANCE, not similarity
            if (!Double.isFinite(similarity) || similarity < minSimilarity) continue;
            db.query("""
                    SELECT title, source, content FROM ai_knowledge WHERE id = ?
                    """, rs -> {
                String content = rs.getString("content");
                context.append("\nTài liệu: ").append(rs.getString("title"))
                        .append(" | Nguồn: ").append(rs.getString("source"))
                        .append("\n").append(content, 0, Math.min(1200, content.length()))
                        .append("\n");
            }, hit.knowledgeId());
        }
        return context.isEmpty() ? "Không tìm được tài liệu đủ liên quan trong kho kiến thức."
                : context.toString();
    }

    private record Hit(String knowledgeId, double distance) {}
}
