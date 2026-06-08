import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getDateKeyInTimeZone,
  resolvePatientDateKey,
  entryDateFromKey,
} from "../utils/patient-timezone";

describe("patient-timezone", () => {
  it("resolve data do header do paciente", () => {
    assert.equal(
      resolvePatientDateKey({ patientDate: "2026-06-07", patientTimeZone: "Europe/Lisbon" }),
      "2026-06-07",
    );
  });

  it("calcula data pelo fuso quando header de data não vem", () => {
    const date = new Date("2026-06-07T02:30:00.000Z");
    assert.equal(getDateKeyInTimeZone("America/Sao_Paulo", date), "2026-06-06");
  });

  it("normaliza entryDate para meio-dia UTC", () => {
    const entry = entryDateFromKey("2026-06-07");
    assert.equal(entry.toISOString(), "2026-06-07T12:00:00.000Z");
  });
});
