package com.fitlog.backend.service;

import com.fitlog.backend.dto.ApiDtos.PlanInput;
import com.fitlog.backend.dto.ApiDtos.PlanView;
import com.fitlog.backend.entity.WorkoutPlan;
import com.fitlog.backend.repository.UserRepository;
import com.fitlog.backend.repository.WorkoutPlanRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.*;

/** Server-controlled plan collision handling. User ownership and transaction are mandatory. */
@Service
public class PlanBatchService {
    private static final Set<String> TYPES = Set.of("Chạy bộ", "Gym", "Đạp xe", "Đi bộ", "Yoga", "Khác");
    private static final Set<String> INTENSITIES = Set.of("nhẹ", "vừa");
    private static final Set<String> DECISIONS = Set.of("CREATE", "KEEP", "REPLACE");

    private final JdbcTemplate db;
    private final UserRepository users;
    private final WorkoutPlanRepository plans;

    public PlanBatchService(JdbcTemplate db, UserRepository users, WorkoutPlanRepository plans) {
        this.db = db;
        this.users = users;
        this.plans = plans;
    }

    public record PreviewRow(int index, PlanInput proposed, List<PlanView> existing) {}
    public record Preview(List<PreviewRow> rows, int conflictDays) {}

    public record Choice(@NotNull @Valid PlanInput plan, @NotNull String decision, String expectedExistingId) {}
    public record ResolveRequest(@NotEmpty List<@Valid Choice> choices) {}
    public record Result(int created, int replaced, int kept, List<PlanView> plans) {}

    /** Chat actions may change the date, but can never rewrite the AI's title/type/minutes. */
    public record ChatChoice(String date, String decision, String expectedExistingId) {}
    public record ChatDecisions(List<ChatChoice> choices) {}

    private void validate(List<PlanInput> inputs) {
        if (inputs == null || inputs.isEmpty() || inputs.size() > 5)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ áp dụng từ 1 đến 5 buổi tập.");
        Set<LocalDate> seen = new HashSet<>();
        for (PlanInput p : inputs) {
            if (p == null || p.date() == null || p.title() == null || p.title().isBlank() ||
                p.title().length() > 100 || p.minutes() == null || p.minutes() < 5 || p.minutes() > 180 ||
                p.note() != null && p.note().length() > 500 ||
                !TYPES.contains(p.type()) || !INTENSITIES.contains(p.intensity()))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Buổi tập được đề xuất không hợp lệ.");
            if (p.date().isBefore(LocalDate.now()) || p.date().isAfter(LocalDate.now().plusDays(28)))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ chọn ngày từ hôm nay đến 28 ngày tới.");
            if (!seen.add(p.date()))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Đề xuất có 2 buổi trùng ngày " + p.date() + ". Hãy chọn ngày khác.");
        }
    }

    private List<WorkoutPlan> plannedOn(String uid, LocalDate date) {
        return plans.findByUserIdAndDateBetweenOrderByDateAsc(uid, date, date).stream()
            .filter(p -> "PLANNED".equals(p.status))
            .toList();
    }

    @Transactional(readOnly = true)
    public Preview preview(String uid, List<PlanInput> inputs) {
        validate(inputs);
        List<PreviewRow> out = new ArrayList<>();
        int conflictDays = 0;
        for (int i = 0; i < inputs.size(); i++) {
            PlanInput p = inputs.get(i);
            List<PlanView> existing = plannedOn(uid, p.date()).stream().map(PlanView::of).toList();
            if (!existing.isEmpty()) conflictDays++;
            out.add(new PreviewRow(i, p, existing));
        }
        return new Preview(out, conflictDays);
    }

    /** One lock + one transaction: no partial schedule on errors or concurrent confirmations. */
    @Transactional
    public Result resolve(String uid, List<Choice> choices) {
        if (choices == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu lựa chọn xử lý lịch trùng.");
        validate(choices.stream().map(c -> c == null ? null : c.plan()).toList());
        db.queryForObject("SELECT id FROM users WHERE id=? FOR UPDATE", String.class, uid);
        int created = 0, replaced = 0, kept = 0;
        List<PlanView> result = new ArrayList<>();
        for (Choice c : choices) {
            if (c.decision() == null || !DECISIONS.contains(c.decision()))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lựa chọn xử lý xung đột không hợp lệ.");
            PlanInput input = c.plan();
            List<WorkoutPlan> active = plannedOn(uid, input.date());
            if (active.size() > 1)
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Có nhiều buổi tập trong ngày " + input.date() + ". Vui lòng xử lý trong Planner.");
            if ("CREATE".equals(c.decision())) {
                if (!active.isEmpty())
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Ngày " + input.date() + " đã có lịch. Hãy xem lại lựa chọn.");
                WorkoutPlan p = new WorkoutPlan();
                p.user = users.getReferenceById(uid);
                update(p, input);
                result.add(PlanView.of(plans.save(p)));
                created++;
            } else {
                if (active.size() != 1 || c.expectedExistingId() == null ||
                        !active.get(0).id.equals(c.expectedExistingId()))
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Lịch ngày " + input.date() + " đã thay đổi. Hãy kiểm tra lại trước khi lưu.");
                WorkoutPlan p = active.get(0);
                if ("KEEP".equals(c.decision())) {
                    result.add(PlanView.of(p));
                    kept++;
                } else {
                    // Update same record, never delete a COMPLETED or SKIPPED workout.
                    update(p, input);
                    result.add(PlanView.of(plans.save(p)));
                    replaced++;
                }
            }
        }
        return new Result(created, replaced, kept, result);
    }

    private void update(WorkoutPlan p, PlanInput input) {
        p.date = input.date();
        p.title = input.title().trim();
        p.type = input.type();
        p.minutes = input.minutes();
        p.intensity = input.intensity();
        p.note = input.note();
    }
}
