
package com.fitlog.backend.controller;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fitlog.backend.security.CurrentUser;
import com.fitlog.backend.service.AiQuotaService;
import com.fitlog.backend.service.AiDataService;

@RestController
@RequestMapping("/api/coach")
public class AiCoachController {

    private final String key;
    private final String model;
    private final String baseUrl;
    private final ObjectMapper mapper;
    private final AiQuotaService quota;
    private final AiDataService data;

    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();


    public AiCoachController(
            @Value("${fitlog.ai.api-key:}") String key,
            @Value("${fitlog.ai.model:gemini-2.5-flash}") String model,
            @Value("${fitlog.ai.base-url}") String baseUrl,
            ObjectMapper mapper,
            AiQuotaService quota,
            AiDataService data
    ) {
        this.key = key;
        this.model = model;
        this.baseUrl = baseUrl;
        this.mapper = mapper;
        this.quota = quota;
        this.data = data;
    }

    @PostMapping("/plan")
    public JsonNode plan(
            @RequestBody JsonNode payload,
            Authentication auth
    ) {

        // 1. Xác định người dùng đã đăng nhập
        String uid = CurrentUser.from(auth).id();

        if (key == null || key.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Gemini API chưa được cấu hình."
            );
        }

        // 2. Yêu cầu đồng ý sử dụng AI
        if (!payload.path("consent").asBoolean(false)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Bạn cần đồng ý sử dụng AI Coach."
            );
        }

        JsonNode prefs = payload.path("prefs");
        JsonNode history = payload.path("history");

        // 3. Kiểm tra dữ liệu đầu vào
        if (!Set.of("habit", "endurance", "activity", "relax")
                .contains(prefs.path("goal").asText())
                || !Set.of("beginner", "intermediate")
                .contains(prefs.path("level").asText())
                || prefs.path("daysPerWeek").asInt(0) < 1
                || prefs.path("daysPerWeek").asInt(0) > 5
                || !history.isObject()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Dữ liệu yêu cầu AI không hợp lệ."
            );
        }

        // Quota luu MariaDB: khong con ConcurrentHashMap/AtomicInteger.
        if (!data.hasConsent(uid)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chưa đồng ý gửi dữ liệu cho AI.");
        }
        quota.useOne(uid);

        // 5. Chỉ gửi dữ liệu thống kê được cho phép
        ObjectNode safe = mapper.createObjectNode();

        ObjectNode cleanPrefs = safe.putObject("prefs");
        cleanPrefs.put("goal", prefs.path("goal").asText());
        cleanPrefs.put("level", prefs.path("level").asText());
        cleanPrefs.put(
                "daysPerWeek",
                prefs.path("daysPerWeek").asInt()
        );

        ObjectNode stats = safe.putObject("history");

        for (String f : List.of(
                "sessionsLast7",
                "minutesLast7",
                "sessionsPrev7",
                "daysSinceLast",
                "avgMinutes"
        )) {
            JsonNode v = history.path(f);

            if (v.isNumber()
                    && v.asDouble() >= 0
                    && v.asDouble() < 100000) {
                stats.set(f, v);
            }
        }

        if (history.path("favoriteTypes").isArray()) {
            ArrayNode favorite = stats.putArray("favoriteTypes");

            Set<String> allowed = Set.of(
                    "Chạy bộ",
                    "Gym",
                    "Đạp xe",
                    "Đi bộ",
                    "Yoga",
                    "Khác"
            );

            for (JsonNode t : history.path("favoriteTypes")) {
                if (favorite.size() >= 2) break;

                String type = t.asText();

                if (allowed.contains(type)) {
                    favorite.add(type);
                }
            }
        }

        if (history.path("weeks").isArray()) {
            ArrayNode weeks = stats.putArray("weeks");

            for (JsonNode w : history.path("weeks")) {
                if (weeks.size() >= 4) break;

                String start = w.path("weekStart").asText();

                if (!start.matches(
                        "[0-9]{4}-[0-9]{2}-[0-9]{2}"
                )) continue;

                ObjectNode week = weeks.addObject();

                week.put("weekStart", start);
                week.put(
                        "sessions",
                        Math.max(0, Math.min(
                                100,
                                w.path("sessions").asInt()
                        ))
                );

                week.put(
                        "minutes",
                        Math.max(0, Math.min(
                                10000,
                                w.path("minutes").asInt()
                        ))
                );
            }
        }

        // 6. Prompt tạo lịch luyện tập
        String instruction = """
                You are a recreational fitness coach.
                You are NOT a medical professional.

                Create a safe weekly workout schedule.

                Requirements:
                - Respond in Vietnamese.
                - Return exactly one valid JSON object.
                - Do not use markdown.
                - Include 1 to 5 workout sessions.
                - Each session lasts 15 to 60 minutes.
                - Recommend rest between intensive sessions.
                - Beginners should receive gentle workouts.
                - Do not diagnose medical conditions.
                - Do not invent medical history.

                Required JSON format:

                {
                  "summary": "Vietnamese explanation",
                  "plan": [
                    {
                      "title": "Workout name",
                      "minutes": 30,
                      "notes": "Workout instructions"
                    }
                  ]
                }
                """;

        try {
            // 7. Tạo request Gemini
            ObjectNode req = mapper.createObjectNode();

            req.put("model", model);
            req.put("temperature", 0.2);
            req.put("max_tokens", 1200);
            req.put("stream", false);

            ArrayNode messages = req.putArray("messages");

            messages.addObject()
                    .put("role", "system")
                    .put("content", instruction);

            messages.addObject()
                    .put("role", "user")
                    .put("content", safe.toString());

            req.putObject("response_format")
                    .put("type", "json_object");

            // 8. Gửi request đến Gemini
            HttpRequest outbound = HttpRequest.newBuilder(
                            URI.create(baseUrl)
                    )
                    .timeout(Duration.ofSeconds(90))
                    .header(
                            "Authorization",
                            "Bearer " + key
                    )
                    .header(
                            "Content-Type",
                            "application/json"
                    )
                    .POST(
                            HttpRequest.BodyPublishers
                                    .ofString(req.toString())
                    )
                    .build();

            HttpResponse<String> response = client.send(
                    outbound,
                    HttpResponse.BodyHandlers.ofString()
            );

            // 9. Kiểm tra kết quả HTTP
            if (response.statusCode() == 429) {
                throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Gemini đang giới hạn yêu cầu."
                );
            }

            if (response.statusCode() < 200
                    || response.statusCode() >= 300) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Gemini trả về lỗi HTTP "
                                + response.statusCode()
                );
            }

            // 10. Đọc nội dung Gemini trả về
            JsonNode responseJson = mapper.readTree(
                    response.body()
            );

            String content = responseJson
                    .path("choices")
                    .path(0)
                    .path("message")
                    .path("content")
                    .asText("");

            if (content.isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Gemini không trả về nội dung."
                );
            }

            String cleaned = content.trim()
                    .replaceFirst(
                            "(?s)^```(?:json)?\\s*",
                            ""
                    )
                    .replaceFirst(
                            "(?s)\\s*```$",
                            ""
                    );

            JsonNode result = mapper.readTree(cleaned);

            // 11. Kiểm tra cấu trúc JSON
            if (!result.isObject()
                    || !result.path("summary").isTextual()
                    || !result.path("plan").isArray()
                    || result.path("plan").isEmpty()
                    || result.path("plan").size() > 5) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Gemini trả về lịch tập không hợp lệ."
                );
            }

            ArrayNode out = mapper.createArrayNode();

            for (JsonNode item : result.path("plan")) {

                if (!item.path("title").isTextual()
                        || !item.path("minutes").isInt()) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_GATEWAY,
                            "Dữ liệu buổi tập không hợp lệ."
                    );
                }

                int minutes = item.path("minutes").asInt();

                if (minutes < 15 || minutes > 60) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_GATEWAY,
                            "Thời lượng buổi tập không hợp lệ."
                    );
                }

                String title = item.path("title").asText();
                String notes = item.path("notes").asText("");

                out.addObject()
                        .put(
                                "title",
                                title.substring(
                                        0,
                                        Math.min(80, title.length())
                                )
                        )
                        .put("minutes", minutes)
                        .put(
                                "notes",
                                notes.substring(
                                        0,
                                        Math.min(200, notes.length())
                                )
                        );
            }

            // 12. Trả lịch tập về React Native
            ObjectNode normalized = mapper.createObjectNode();

            String summary = result.path("summary").asText();

            normalized.put(
                    "summary",
                    summary.substring(
                            0,
                            Math.min(600, summary.length())
                    )
            );

            normalized.set("plan", out);

            return normalized;

        } catch (ResponseStatusException e) {
            throw e;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Yêu cầu AI bị gián đoạn."
            );

        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Không kết nối được Gemini hoặc phản hồi không hợp lệ."
            );
        }
    }
}
