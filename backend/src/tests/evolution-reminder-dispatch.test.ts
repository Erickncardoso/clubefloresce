import test from "node:test";
import assert from "node:assert/strict";
import {
  areDailyGoalsStillZero,
  goalsReminderSourceKey,
  weightReminderSourceKey,
} from "../services/evolution-reminder-dispatch.service";

test("evolution goals: considera zeradas quando não há progresso diário", () => {
  assert.equal(
    areDailyGoalsStillZero(
      {
        goals: [
          { id: "water", frequency: "daily" },
          { id: "sleep", frequency: "daily" },
          { id: "food", frequency: "weekly" },
        ],
        progress: {},
      },
      "2026-08-05",
    ),
    true,
  );
});

test("evolution goals: não lembra se já registrou algo no dia", () => {
  assert.equal(
    areDailyGoalsStillZero(
      {
        goals: [
          { id: "water", frequency: "daily" },
          { id: "sleep", frequency: "daily" },
        ],
        progress: {
          "water:2026-08-05": 0.5,
        },
      },
      "2026-08-05",
    ),
    false,
  );
});

test("evolution goals: sem metas cadastradas ainda conta como zerado", () => {
  assert.equal(areDailyGoalsStillZero({ goals: [], progress: {} }, "2026-08-05"), true);
});

test("evolution source keys: estáveis por mês/hora", () => {
  assert.equal(
    weightReminderSourceKey(2026, 8, "user-1"),
    "weight-reminder:2026-08:user-1",
  );
  assert.equal(
    goalsReminderSourceKey("2026-08-05", 12, "user-1"),
    "goals-reminder:2026-08-05:12:user-1",
  );
});
