import type { GraphNode, GraphEdge } from '../data/connections';

export interface CommandStripData {
  bottleneck:  { node: GraphNode; dependentCount: number } | null;
  singlePoint: { node: GraphNode; maxConc: number } | null;
  topConc:     { edge: GraphEdge; src: GraphNode | null; tgt: GraphNode | null } | null;
  geoRisk:     { region: string; count: number; topNode: GraphNode } | null;
}

export function computeCommandStrip(nodes: GraphNode[], edges: GraphEdge[]): CommandStripData {
  const monopolyNodes = nodes.filter(n => n.monopoly);

  // #1 Bottleneck: monopoly node with most outgoing edges
  const bottleneckNode = monopolyNodes.length > 0
    ? monopolyNodes.reduce((best, n) => {
        const out  = edges.filter(e => e.source === n.id).length;
        const bOut = edges.filter(e => e.source === best.id).length;
        return out > bOut ? n : best;
      })
    : null;

  // #1 Single Point: highest importance monopoly (may differ from bottleneck)
  const singlePointNode = monopolyNodes.length > 0
    ? monopolyNodes.reduce((best, n) => n.importance > best.importance ? n : best)
    : null;
  const singlePointMaxConc = singlePointNode
    ? Math.max(...edges.filter(e => e.target === singlePointNode.id).map(e => e.concentration), 0)
    : 0;

  // #1 Top Concentration edge
  const topConcEdge = edges.length > 0
    ? edges.reduce((best, e) => e.concentration > best.concentration ? e : best)
    : null;

  // #1 Geo Risk: region with most critical/high nodes
  const geoMap: Record<string, GraphNode[]> = {};
  nodes.forEach(n => {
    if (n.risk === 'critical' || n.risk === 'high') {
      if (!geoMap[n.region]) geoMap[n.region] = [];
      geoMap[n.region].push(n);
    }
  });
  const topGeoEntry = Object.entries(geoMap).sort((a, b) => b[1].length - a[1].length)[0];
  const topGeoNode   = topGeoEntry
    ? (topGeoEntry[1].find(n => n.risk === 'critical') ?? topGeoEntry[1][0])
    : null;

  return {
    bottleneck:  bottleneckNode ? { node: bottleneckNode, dependentCount: edges.filter(e => e.source === bottleneckNode.id).length } : null,
    singlePoint: singlePointNode ? { node: singlePointNode, maxConc: singlePointMaxConc } : null,
    topConc:     topConcEdge ? {
      edge: topConcEdge,
      src:  nodes.find(n => n.id === topConcEdge.source)  ?? null,
      tgt:  nodes.find(n => n.id === topConcEdge.target)  ?? null,
    } : null,
    geoRisk: topGeoEntry && topGeoNode ? { region: topGeoEntry[0], count: topGeoEntry[1].length, topNode: topGeoNode } : null,
  };
}
