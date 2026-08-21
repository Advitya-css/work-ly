/**
 * Client-safe half of the what-if layer: the scenario vocabulary and result
 * shape, with no server-only dependencies.
 *
 * Kept separate from what-if.ts (which imports the scoring engine and is
 * therefore server-only) so the panel component can render scenario tabs
 * and results without dragging the whole scoring stack into the browser
 * bundle. Same split as lib/ai/job-parser-types.ts.
 */

export type ScenarioKind = "LEARN_SKILL" | "RELOCATE" | "GAIN_EXPERIENCE";

export interface Scenario {
  kind: ScenarioKind;
  /// Skill name (LEARN_SKILL), country/location (RELOCATE), or number of
  /// additional years as a string (GAIN_EXPERIENCE).
  value: string;
}

export interface SimulationResult {
  /// Always true. Present in the payload so a caller can't render one of
  /// these without the flag being in front of them.
  isSimulation: true;
  scenario: Scenario;
  label: string;
  currentReadiness: number;
  simulatedReadiness: number;
  delta: number;
  caveat: string;
}

export const SCENARIO_KINDS: { kind: ScenarioKind; label: string; placeholder: string }[] = [
  { kind: "LEARN_SKILL", label: "Learn a skill", placeholder: "e.g. Python" },
  { kind: "RELOCATE", label: "Move somewhere", placeholder: "e.g. Australia" },
  { kind: "GAIN_EXPERIENCE", label: "Gain experience", placeholder: "e.g. 2 (years)" },
];
