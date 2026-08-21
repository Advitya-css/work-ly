"use client";

import { useState, useTransition } from "react";
import { FlaskConical, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { simulateScenarioAction } from "@/lib/pathway/actions";
import { SCENARIO_KINDS, type ScenarioKind, type SimulationResult } from "@/lib/pathway/what-if-types";

/**
 * Every rendered path here labels the output as a simulation and shows the
 * caveat that came back with it - the engine returns `isSimulation: true`
 * and a `caveat` string precisely so this component can't quietly present
 * a hypothetical as a fact.
 */
export function WhatIfPanel({ dreamJobId }: { dreamJobId: string }) {
  const [kind, setKind] = useState<ScenarioKind>("LEARN_SKILL");
  const [value, setValue] = useState("");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const active = SCENARIO_KINDS.find((s) => s.kind === kind)!;

  function run() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const response = await simulateScenarioAction(dreamJobId, { kind, value });
      if ("error" in response) setError(response.error);
      else setResult(response.result);
    });
  }

  const DeltaIcon = !result ? Minus : result.delta > 0 ? TrendingUp : result.delta < 0 ? TrendingDown : Minus;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          What-if simulation
        </CardTitle>
        <CardDescription>
          Try a hypothetical change and see how your readiness would move. These are simulations, not
          predictions: nothing here is saved to your profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Tabs value={kind} onValueChange={(v) => { setKind(v as ScenarioKind); setResult(null); setError(null); }}>
          <TabsList>
            {SCENARIO_KINDS.map((s) => (
              <TabsTrigger key={s.kind} value={s.kind}>
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={active.placeholder}
            className="max-w-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                run();
              }
            }}
          />
          <Button type="button" size="sm" onClick={run} disabled={pending || !value.trim()}>
            {pending ? <Loader2 className="animate-spin" /> : <FlaskConical />}
            Simulate
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border px-4 py-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Simulation</Badge>
              <p className="text-sm font-medium text-foreground">{result.label}</p>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-sm text-muted-foreground">
                Readiness {result.currentReadiness}/100
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {result.simulatedReadiness}
                <span className="text-sm font-medium text-muted-foreground">/100</span>
              </span>
              <span
                className={
                  result.delta > 0
                    ? "flex items-center gap-1 text-sm font-medium text-success"
                    : result.delta < 0
                      ? "flex items-center gap-1 text-sm font-medium text-destructive"
                      : "flex items-center gap-1 text-sm font-medium text-muted-foreground"
                }
              >
                <DeltaIcon className="size-4" />
                {result.delta > 0 ? "+" : ""}
                {result.delta}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{result.caveat}</p>
            <p className="text-xs text-muted-foreground">
              This is a hypothetical Candidate Fit, not a prediction about whether you&apos;d be hired.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
