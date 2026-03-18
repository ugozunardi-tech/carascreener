import type { GraphEdge } from '../data/connections';

export type ScenarioType = 'disruption' | 'demand_surge' | 'tariff' | 'bankruptcy';

export interface NodeImpact {
  nodeId:    string;
  score:     number;     // -1.0 (very negative) → +1.0 (very positive)
  direction: 'origin' | 'upstream' | 'downstream';
  hops:      number;
  reason:    string;
}

// How each scenario propagates up/downstream
// downstream = companies that BUY from the affected node
// upstream   = companies that SUPPLY TO the affected node
const SCENARIO_VECTORS: Record<ScenarioType, { downstream: number; upstream: number }> = {
  disruption:   { downstream: -1.0, upstream: -0.6 },  // buyers suffer, suppliers lose revenue
  demand_surge: { downstream: +0.8, upstream: +1.0 },  // buyers benefit, suppliers benefit more
  tariff:       { downstream: -0.7, upstream: -0.5 },  // margin squeeze both directions
  bankruptcy:   { downstream: -1.0, upstream: -0.9 },  // catastrophic both ways
};

const DECAY = 0.52; // impact per hop multiplier (tune: lower = shorter reach)

export function propagateImpact(
  originId:  string,
  scenario:  ScenarioType,
  edges:     GraphEdge[],
  maxHops =  3
): Map<string, NodeImpact> {
  const results = new Map<string, NodeImpact>();

  results.set(originId, {
    nodeId:    originId,
    score:     scenario === 'demand_surge' ? 0.5 : -1.0,
    direction: 'origin',
    hops:      0,
    reason:    `Origin of ${scenario.replace('_', ' ')}`,
  });

  const queue: Array<{ id: string; score: number; hops: number }> = [
    { id: originId, score: results.get(originId)!.score, hops: 0 },
  ];

  const vectors = SCENARIO_VECTORS[scenario];

  while (queue.length > 0) {
    const { id, score, hops } = queue.shift()!;
    if (hops >= maxHops) continue;

    // ── Downstream edges: this node is the SOURCE → impacts TARGET ─────────
    edges
      .filter(e => (e.source as string) === id)
      .forEach(e => {
        const tgt = e.target as string;
        if (tgt === originId) return;

        // Stronger edges carry more impact; high concentration = more vulnerable
        const edgeWeight  = (e.strength ?? 5) / 10;
        const concBoost   = (e.concentration ?? 0.3) * 0.4;
        const decay       = DECAY * (0.7 + edgeWeight * 0.3);
        const rawScore    = score * decay * vectors.downstream;
        const finalScore  = clamp(rawScore - (rawScore < 0 ? concBoost : -concBoost * 0.5), -1, 1);

        const existing = results.get(tgt);
        if (!existing || Math.abs(existing.score) < Math.abs(finalScore)) {
          const impact: NodeImpact = {
            nodeId:    tgt,
            score:     finalScore,
            direction: 'downstream',
            hops:      hops + 1,
            reason:    buildReason(scenario, id, tgt, hops + 1, 'downstream', e),
          };
          results.set(tgt, impact);
          queue.push({ id: tgt, score: finalScore, hops: hops + 1 });
        }
      });

    // ── Upstream edges: this node is the TARGET → impacts SOURCE ──────────
    edges
      .filter(e => (e.target as string) === id)
      .forEach(e => {
        const src = e.source as string;
        if (src === originId) return;

        const edgeWeight  = (e.strength ?? 5) / 10;
        const decay       = DECAY * (0.5 + edgeWeight * 0.3); // upstream decays faster
        const rawScore    = score * decay * vectors.upstream;
        const finalScore  = clamp(rawScore, -1, 1);

        const existing = results.get(src);
        if (!existing || Math.abs(existing.score) < Math.abs(finalScore)) {
          const impact: NodeImpact = {
            nodeId:    src,
            score:     finalScore,
            direction: 'upstream',
            hops:      hops + 1,
            reason:    buildReason(scenario, id, src, hops + 1, 'upstream', e),
          };
          results.set(src, impact);
          queue.push({ id: src, score: finalScore, hops: hops + 1 });
        }
      });
  }

  return results;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function buildReason(
  scenario: ScenarioType,
  fromId:   string,
  toId:     string,
  hops:     number,
  dir:      'upstream' | 'downstream',
  edge:     GraphEdge
): string {
  const ordinal = hops === 1 ? '1st' : hops === 2 ? '2nd' : '3rd';
  const verb =
    scenario === 'disruption'   ? 'supply disruption at' :
    scenario === 'demand_surge' ? 'demand surge at' :
    scenario === 'tariff'       ? 'tariff shock at' :
    'bankruptcy of';
  const dirLabel = dir === 'downstream' ? 'downstream via' : 'upstream via';
  return `${ordinal}-order effect — ${verb} ${fromId} propagates ${dirLabel} ${edge.type} link (${edge.label})`;
}

// Score → human-readable label
export function scoreLabel(score: number): string {
  if (score >  0.7) return 'Strong Beneficiary';
  if (score >  0.3) return 'Mild Beneficiary';
  if (score >  0.1) return 'Slightly Positive';
  if (score > -0.1) return 'Neutral';
  if (score > -0.3) return 'Minor Impact';
  if (score > -0.6) return 'Moderate Impact';
  if (score > -0.85) return 'Severe Impact';
  return 'Critical Impact';
}

// Score → color
export function scoreColor(score: number): string {
  if (score >  0.5) return '#00e676';
  if (score >  0.2) return '#69f0ae';
  if (score >  0.0) return '#b9f6ca';
  if (score > -0.2) return '#ffeb3b';
  if (score > -0.5) return '#ff9800';
  if (score > -0.75) return '#ff5722';
  return '#ff1744';
}
