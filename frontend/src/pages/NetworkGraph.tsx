import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import {
  NODES, EDGES, type GraphNode, type GraphEdge, type EdgeType, type RiskLevel,
} from '../data/connections';
import { propagateImpact, scoreColor, scoreLabel, type ScenarioType, type NodeImpact } from '../utils/impact';
import { useNavigate } from 'react-router-dom';
import {
  ZoomIn, ZoomOut, Maximize2, Filter, X, ExternalLink,
  ArrowDownLeft, ArrowUpRight, Zap, AlertTriangle, ChevronDown, Search, Layers, LayoutList, Eye, BarChart2, Activity,
} from 'lucide-react';
import { fetchNodeNews, type NewsArticle } from '../components/UI/NotificationPanel';
import DeepAnalysisPanel from '../components/UI/DeepAnalysisPanel';
import { RiskBadge } from '../components/UI/RiskBadge';
import { CriticalityBar } from '../components/UI/CriticalityBar';
import { CommandStrip } from '../components/UI/CommandStrip';
import { FinancialExposurePanel } from '../components/UI/FinancialExposure';
import { TimeToImpactTimeline } from '../components/UI/TimeToImpact';
import { DisruptionProbabilityPanel } from '../components/UI/DisruptionProbability';
import { CapacityStatusPanel } from '../components/UI/CapacityStatus';
import { MarketAnglePanel } from '../components/UI/MarketAngle';
import { WatchlistPanel } from '../components/UI/WatchlistPanel';
import { NODE_INTELLIGENCE } from '../data/nodeIntelligence';

const SIGNAL_COLORS: Record<string, string> = {
  'INVESTMENT': '#00e676', 'M&A': '#a78bfa', 'SUPPLY CHAIN': '#00d4ff',
  'REGULATORY': '#ff9800', 'DISRUPTION': '#ff1744', 'NEWS': '#64748b',
};
function newsTimeAgo(ts: number) {
  const d = Date.now() / 1000 - ts;
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface SimNode extends GraphNode, d3.SimulationNodeDatum { x?: number; y?: number }
interface SimEdge extends d3.SimulationLinkDatum<SimNode> {
  source: SimNode | string; target: SimNode | string;
  type: EdgeType; label: string; strength: number; concentration: number;
  substitutable: boolean; risk: RiskLevel; contractType?: string; value?: string;
}

// AI-generated supply chain node/edge (same shape, stored separately)
export interface DynNode extends GraphNode { _dynamic: true }
export interface DynEdge extends Omit<GraphEdge, 'contractType'> { contractType?: string; _dynamic: true }

// ── Visual constants ──────────────────────────────────────────────────────────
const EDGE_STYLE: Record<EdgeType, { color: string; dash: string; label: string }> = {
  supplier:   { color: '#00d4ff', dash: 'none',  label: 'Supplier'    },
  foundry:    { color: '#c084fc', dash: 'none',  label: 'Foundry'     },
  material:   { color: '#fbbf24', dash: '6,3',   label: 'Material'    },
  customer:   { color: '#4ade80', dash: 'none',  label: 'Customer'    },
  technology: { color: '#60a5fa', dash: '8,4',   label: 'Technology'  },
  power:      { color: '#fb923c', dash: '4,3',   label: 'Energy'      },
  testing:    { color: '#34d399', dash: '5,3',   label: 'Testing'     },
  thematic:   { color: '#94a3b8', dash: '3,6',   label: 'Thematic'    },
};

const RISK_RING: Record<RiskLevel, string> = {
  critical: '#ff1744', high: '#ff9800', medium: '#ffeb3b', low: 'transparent',
};

const PORTFOLIO_COLORS: Record<string, string> = {
  ai: '#a78bfa', robotics: '#f59e0b', watchlist: '#00d4ff', multi: '#00e676',
  extended: '#475569', dynamic: '#e879f9', 'nvidia-sc': '#76b900',
};

const PTLABELS: Record<string, string> = {
  all: 'All', ai: 'AI Infra', robotics: 'Robotics SC', watchlist: 'Watchlist', multi: 'Multi', 'nvidia-sc': 'NVIDIA SC',
};

const CONTRACT_COLORS: Record<string, string> = {
  'sole-source':  '#ff1744',
  'captive':      '#ff5722',
  'long-term':    '#f59e0b',
  'strategic':    '#60a5fa',
  'multi-source': '#34d399',
  'spot':         '#94a3b8',
};

const SCENARIO_META: Record<ScenarioType, { label: string; color: string }> = {
  disruption:   { label: 'Supply Disruption', color: '#ff5722' },
  demand_surge: { label: 'Demand Surge',       color: '#00e676' },
  tariff:       { label: 'Tariff / Sanction',  color: '#ff9800' },
  bankruptcy:   { label: 'Bankruptcy',          color: '#ff1744' },
};

function nodeRadius(importance: number) { return 7 + importance * 1.85; }
function edgeWidth(strength: number)    { return 0.8 + strength * 0.18; }

// ── Node scoring helpers ───────────────────────────────────────────────────────
const RISK_WEIGHT: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

function critScore(node: GraphNode, edges: GraphEdge[]): number {
  const conns = edges.filter(e => e.source === node.id || e.target === node.id).length;
  return node.importance * (RISK_WEIGHT[node.risk] ?? 1) + conns * 0.5 + (node.monopoly ? 8 : 0);
}

function whyItMatters(node: GraphNode, edges: GraphEdge[]): string {
  const outs    = edges.filter(e => e.source === node.id);
  const ins     = edges.filter(e => e.target === node.id);
  const maxConc = ins.length > 0 ? Math.max(...ins.map(e => e.concentration)) : 0;
  const lockedIn = ins.filter(e => !e.substitutable).length;

  if (node.monopoly && outs.length >= 5)
    return `Only viable source — failure cascades to ${outs.length} direct dependents with zero fallback path.`;
  if (node.monopoly && node.risk === 'critical')
    return `No substitute exists at any price. A disruption here has no mitigation option.`;
  if (node.region === 'TW' && node.risk === 'critical')
    return `Binary Taiwan risk — any conflict scenario removes this node from the chain entirely.`;
  if (maxConc > 0.8)
    return `${Math.round(maxConc * 100)}% of downstream supply flows through here — buyer has no credible alternative.`;
  if (lockedIn >= 2)
    return `${lockedIn} non-substitutable input paths — locked-in exposure with no near-term exit.`;
  if (node.importance >= 9)
    return `Highest structural importance in the network — critical throughput for the entire ${node.sector.toLowerCase()} chain.`;
  if (node.risk === 'critical' && node.importance >= 7)
    return `Critical risk + high importance — disruption causes immediate supply shortfall with no quick fix.`;
  if (node.importance >= 7)
    return `High-importance node (${node.importance}/10) — key throughput in ${node.sector.toLowerCase()} with ${ins.length + outs.length} active relationships.`;
  return `Supply chain node in ${node.sector} with ${node.risk} risk profile and ${ins.length + outs.length} active supply relationships.`;
}

function computeStrategicAngle(node: GraphNode, edges: GraphEdge[]): { pricingPower: string; moat: string; powerColor: string } {
  const inEdges     = edges.filter(e => e.target === node.id);
  const hasSole     = inEdges.some(e => e.contractType === 'sole-source' || e.contractType === 'captive');
  const avgConc     = inEdges.length > 0 ? inEdges.reduce((s, e) => s + e.concentration, 0) / inEdges.length : 0;

  let pricingPower: string;
  let powerColor: string;
  if (node.monopoly)                          { pricingPower = 'DOMINANT'; powerColor = '#a78bfa'; }
  else if (hasSole || avgConc > 0.7)          { pricingPower = 'HIGH';     powerColor = '#ff9800'; }
  else if (avgConc > 0.4 || node.importance >= 7) { pricingPower = 'MEDIUM'; powerColor = '#ffeb3b'; }
  else                                        { pricingPower = 'LOW';      powerColor = '#4ade80'; }

  let moat: string;
  if (node.monopoly && node.importance >= 8)      moat = 'Capital intensity + IP lock-in';
  else if (node.region === 'TW' || node.region === 'NL') moat = 'Geographic concentration + process expertise';
  else if (hasSole)                               moat = 'Long-term contracts + high switching costs';
  else if (node.importance >= 6)                  moat = `Technical complexity + ${node.sector.toLowerCase()} qualification cycles`;
  else                                            moat = 'Industry positioning + customer dependency';

  return { pricingPower, moat, powerColor };
}

function deriveActions(node: GraphNode, edges: GraphEdge[]): Array<{ type: string; label: string; color: string }> {
  const inEdges  = edges.filter(e => e.target === node.id);
  const lockedIn = inEdges.filter(e => !e.substitutable).length;
  const actions: Array<{ type: string; label: string; color: string }> = [];

  if (node.risk === 'critical' && node.monopoly) {
    actions.push({ type: 'ALERT',   label: 'Sole source + critical — immediate portfolio review required', color: '#ff1744' });
  }
  if (node.monopoly || lockedIn >= 2) {
    actions.push({ type: 'HEDGE',   label: `No substitute path — size options on downstream ${node.sector.toLowerCase()} exposure`, color: '#ff5722' });
  }
  if (node.risk === 'critical' || node.risk === 'high') {
    actions.push({ type: 'MONITOR', label: `Track ${node.region} geopolitical events + capacity utilization news`, color: '#ff9800' });
  } else if (node.risk === 'medium') {
    actions.push({ type: 'WATCH',   label: 'Low urgency — include in quarterly supply chain review', color: '#ffeb3b' });
  }
  if (actions.length === 0) {
    actions.push({ type: 'WATCH',   label: `No immediate action — ${node.risk} risk, well-positioned`, color: '#4ade80' });
  }
  return actions.slice(0, 3);
}

function deriveInsights(node: GraphNode, allEdges: GraphEdge[]): string[] {
  const ins  = allEdges.filter(e => e.target === node.id);
  const outs = allEdges.filter(e => e.source === node.id);
  const maxConc = ins.length > 0 ? Math.max(...ins.map(e => e.concentration)) : 0;
  const result: string[] = [];

  if (node.monopoly) {
    result.push(`No substitute — single-source bottleneck. Failure cascades to ${outs.length} downstream node${outs.length !== 1 ? 's' : ''}.`);
  }
  if (node.importance >= 8) {
    result.push(`High structural importance (${node.importance}/10) across ${ins.length + outs.length} supply chain links.`);
  }
  if (maxConc > 0.65) {
    const topEdge = ins.find(e => e.concentration > 0.65);
    result.push(`${Math.round(maxConc * 100)}% supply concentration via ${topEdge ? (topEdge.source as string) : 'single source'} — limited substitution options.`);
  }
  if (node.risk === 'critical' && !node.monopoly) {
    result.push(`Critical risk in ${node.region} — exposed to geopolitical disruption and supply stress events.`);
  } else if (node.risk === 'high' && result.length < 2) {
    result.push(`High-risk node (${node.region}) — monitor for capacity constraints and sourcing alternatives.`);
  }
  if (node.note && result.length < 2) result.push(node.note);
  return result.slice(0, 3);
}

interface Tooltip {
  x: number; y: number;
  node?: SimNode;
  edge?: SimEdge & { _label: string; _type: EdgeType };
}

// ── API ────────────────────────────────────────────────────────────────────────
async function fetchAISupplyChain(symbol: string, name: string) {
  const res = await fetch(`/api/supplychain/${symbol}?name=${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error('Failed to fetch supply chain');
  return res.json() as Promise<{ company: GraphNode; nodes: GraphNode[]; edges: GraphEdge[] }>;
}

async function searchSymbols(q: string) {
  const res = await fetch(`/api/portfolios/search/symbol?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const data = await res.json();
  // Backend returns { results: [{ symbol, name, type }] }
  return ((data.results || data.result || []) as Array<{ symbol: string; name: string; description?: string; type: string }>)
    .map(r => ({ symbol: r.symbol, description: r.name || r.description || r.symbol, type: r.type }));
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function NetworkGraph() {
  const svgRef   = useRef<SVGSVGElement>(null);
  const navigate = useNavigate();

  // ── State ─────────────────────────────────────────────────────────────────
  const [tooltip,           setTooltip]           = useState<Tooltip | null>(null);
  const [selectedPortfolio, setSelectedPortfolio] = useState('all');
  const [selectedEdgeType,  setSelectedEdgeType]  = useState('all');
  const [selectedRisk,      setSelectedRisk]      = useState('all');
  const [showExtended,      setShowExtended]      = useState(false);
  const [selectedNodeId,    setSelectedNodeId]    = useState<string | null>(null);
  const [hoveredNodeId,     setHoveredNodeId]     = useState<string | null>(null);

  // Scenario
  const [scenarioActive,  setScenarioActive]  = useState(false);
  const [scenarioType,    setScenarioType]    = useState<ScenarioType>('disruption');
  const [scenarioOrigin,  setScenarioOrigin]  = useState('');
  const [scenarioHops,    setScenarioHops]    = useState(2);
  const [impactMap,       setImpactMap]       = useState<Map<string, NodeImpact> | null>(null);

  // AI Search
  const [searchQuery,     setSearchQuery]     = useState('');
  const [searchResults,   setSearchResults]   = useState<Array<{ symbol: string; description: string }>>([]);
  const [searchLoading,   setSearchLoading]   = useState(false);
  const [aiLoading,       setAiLoading]       = useState(false);
  const [aiError,         setAiError]         = useState('');
  const [dynNodes,        setDynNodes]        = useState<GraphNode[]>([]);
  const [dynEdges,        setDynEdges]        = useState<GraphEdge[]>([]);
  const [dynLabel,        setDynLabel]        = useState('');

  // Node news (for right panel)
  const [nodeNews,        setNodeNews]        = useState<NewsArticle[]>([]);
  const [nodeNewsLoading, setNodeNewsLoading] = useState(false);
  const [showChainMap,    setShowChainMap]    = useState(false);
  const [showDeepAnalysis, setShowDeepAnalysis] = useState(false);
  const [graphMode,       setGraphMode]       = useState<'network' | 'risk' | 'dependency' | 'financial' | 'capacity'>('network');
  const [showLegend,      setShowLegend]      = useState(false);
  const [selectedNodeImpact, setSelectedNodeImpact] = useState<Map<string, NodeImpact> | null>(null);
  const [showMicroLegend, setShowMicroLegend] = useState(() => localStorage.getItem('microlegend_dismissed') !== '1');

  const searchRef      = useRef<HTMLDivElement>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // D3 refs
  const simRef     = useRef<d3.Simulation<SimNode, SimEdge> | null>(null);
  const zoomRef    = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const nodeSelRef = useRef<d3.Selection<SVGGElement, SimNode, SVGGElement, unknown> | null>(null);
  const edgeSelRef = useRef<d3.Selection<SVGLineElement, SimEdge, SVGGElement, unknown> | null>(null);

  // Refs for D3 click handler (avoid graph rebuild on scenario toggle)
  const scenarioActiveRef = useRef(false);
  useEffect(() => { scenarioActiveRef.current = scenarioActive; }, [scenarioActive]);

  // All nodes & edges merged (static + dynamic)
  const allNodes = useMemo(() => {
    const existing = new Set(NODES.map(n => n.id));
    const fresh    = dynNodes.filter(n => !existing.has(n.id));
    return [...NODES, ...fresh];
  }, [dynNodes]);

  const allEdges = useMemo(() => {
    const key = (e: GraphEdge) => `${e.source}|${e.target}|${e.type}`;
    const existing = new Set(EDGES.map(key));
    const fresh    = dynEdges.filter(e => !existing.has(key(e)));
    return [...EDGES, ...fresh];
  }, [dynEdges]);

  // ── Enrich nodes with institutional intelligence ──────────────────────────
  const enrichedAllNodes = useMemo(() =>
    allNodes.map(n => ({ ...n, ...(NODE_INTELLIGENCE[n.id] ?? {}) })),
    [allNodes]);

  // ── Filtered data ─────────────────────────────────────────────────────────
  const filteredNodes = useMemo(() =>
    enrichedAllNodes.filter(n => {
      if (n.portfolio === 'extended' && !showExtended) return false;
      if (n.portfolio === 'nvidia-sc' && selectedPortfolio !== 'nvidia-sc' && !showExtended) return false;
      if (n.portfolio === 'dynamic') return true;
      if (selectedPortfolio !== 'all' && n.portfolio !== selectedPortfolio) return false;
      if (selectedRisk !== 'all' && n.risk !== selectedRisk) return false;
      return true;
    }), [enrichedAllNodes, showExtended, selectedPortfolio, selectedRisk]);

  const filteredEdges = useMemo(() => {
    const ids = new Set(filteredNodes.map(n => n.id));
    return allEdges.filter(e =>
      ids.has(e.source as string) &&
      ids.has(e.target as string) &&
      (selectedEdgeType === 'all' || e.type === selectedEdgeType)
    );
  }, [allEdges, filteredNodes, selectedEdgeType]);

  // When an edge-type filter is active, drop nodes that have zero visible edges
  // (they'd just float disconnected and clutter the graph)
  const visibleNodes = useMemo(() => {
    if (selectedEdgeType === 'all') return filteredNodes;
    const connected = new Set<string>();
    filteredEdges.forEach(e => {
      connected.add(e.source as string);
      connected.add(e.target as string);
    });
    return filteredNodes.filter(n => connected.has(n.id));
  }, [filteredNodes, filteredEdges, selectedEdgeType]);

  // Auto-compute failure impact when a node is selected (silent BFS)
  useEffect(() => {
    if (!selectedNodeId) { setSelectedNodeImpact(null); return; }
    setSelectedNodeImpact(propagateImpact(selectedNodeId, 'disruption', allEdges, 2));
  }, [selectedNodeId, allEdges]);

  // ── Risk View: top-8 nodes by criticality score ───────────────────────────
  const riskModeNodes = useMemo(() =>
    [...filteredNodes]
      .sort((a, b) => critScore(b, allEdges) - critScore(a, allEdges))
      .slice(0, 8),
    [filteredNodes, allEdges]);

  const riskModeIds = useMemo(() => new Set(riskModeNodes.map(n => n.id)), [riskModeNodes]);

  // ── Panel data (uses ALL edges, not filtered) ─────────────────────────────
  const selectedNode    = selectedNodeId ? enrichedAllNodes.find(n => n.id === selectedNodeId) ?? null : null;
  const visibleIds      = useMemo(() => new Set(visibleNodes.map(n => n.id)), [visibleNodes]);
  const allIncoming     = selectedNodeId ? allEdges.filter(e => e.target === selectedNodeId) : [];
  const allOutgoing     = selectedNodeId ? allEdges.filter(e => e.source === selectedNodeId) : [];

  // Scenario ranked list
  const rankedImpact = useMemo(() => {
    if (!impactMap) return [];
    return [...impactMap.values()]
      .filter(v => v.direction !== 'origin')
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
      .slice(0, 15);
  }, [impactMap]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelectedNodeId(null); setImpactMap(null); setSearchResults([]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch news for selected node
  useEffect(() => {
    if (!selectedNodeId) { setNodeNews([]); return; }
    setNodeNewsLoading(true);
    fetchNodeNews(selectedNodeId)
      .then(setNodeNews)
      .catch(() => setNodeNews([]))
      .finally(() => setNodeNewsLoading(false));
  }, [selectedNodeId]);

  // ── Search handler ────────────────────────────────────────────────────────
  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (q.length < 2) { setSearchResults([]); return; }
    searchDebounce.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchSymbols(q);
        console.log('[search] q=', q, 'results=', results);
        setSearchResults(results.slice(0, 8));
      } catch (err) { console.error('[search] error', err); setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 320);
  }, []);

  // Fetch AI supply chain for a symbol
  const loadAISupplyChain = useCallback(async (symbol: string, name: string) => {
    setAiError('');
    setAiLoading(true);
    setSearchResults([]);
    setSearchQuery('');
    try {
      const data = await fetchAISupplyChain(symbol, name);
      // Tag as dynamic
      const nodes: GraphNode[] = [
        { ...data.company, portfolio: 'dynamic', color: '#e879f9' },
        ...data.nodes.map(n => ({
          ...n,
          portfolio: 'dynamic',
          color: n.color || '#e879f9',
          importance: n.importance ?? 5,
          role: n.role ?? 'midstream',
          risk: n.risk ?? 'medium',
          monopoly: n.monopoly ?? false,
          region: n.region ?? 'US',
        })),
      ];
      const edges: GraphEdge[] = data.edges.map(e => ({
        ...e,
        strength: (e as GraphEdge & { strength?: number }).strength ?? 5,
        concentration: (e as GraphEdge & { concentration?: number }).concentration ?? 0.3,
        substitutable: (e as GraphEdge & { substitutable?: boolean }).substitutable ?? true,
        risk: (e as GraphEdge & { risk?: RiskLevel }).risk ?? 'medium',
      }));
      setDynNodes(nodes);
      setDynEdges(edges);
      setDynLabel(`${symbol} — ${name}`);
      // Select the origin node
      setTimeout(() => setSelectedNodeId(symbol), 300);
    } catch {
      setAiError('AI supply chain generation failed. Check backend.');
    } finally {
      setAiLoading(false);
    }
  }, []);

  // ── Build D3 graph ────────────────────────────────────────────────────────
  const buildGraph = useCallback(() => {
    const svg = d3.select(svgRef.current!);
    svg.selectAll('*').remove();

    const W = svgRef.current!.clientWidth;
    const H = svgRef.current!.clientHeight;

    const defs = svg.append('defs');

    Object.entries(EDGE_STYLE).forEach(([type, s]) => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -3 6 6').attr('refX', 20).attr('refY', 0)
        .attr('markerWidth', 4).attr('markerHeight', 4).attr('orient', 'auto')
        .append('path').attr('d', 'M0,-3L6,0L0,3Z')
        .attr('fill', s.color).attr('opacity', 0.9);
      defs.append('marker')
        .attr('id', `arrow-${type}-hi`)
        .attr('viewBox', '0 -3 6 6').attr('refX', 20).attr('refY', 0)
        .attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto')
        .append('path').attr('d', 'M0,-3L6,0L0,3Z')
        .attr('fill', s.color);
    });

    const mkGlow = (id: string, dev: string) => {
      const f = defs.append('filter').attr('id', id);
      f.append('feGaussianBlur').attr('stdDeviation', dev).attr('result', 'b');
      const m = f.append('feMerge');
      m.append('feMergeNode').attr('in', 'b');
      m.append('feMergeNode').attr('in', 'SourceGraphic');
    };
    mkGlow('glow', '3');
    mkGlow('glow-sel', '7');
    mkGlow('glow-impact', '5');

    const g = svg.append('g');
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.08, 6])
      .on('zoom', e => g.attr('transform', e.transform));
    svg.call(zoom);
    zoomRef.current = zoom;
    svg.on('click', () => setSelectedNodeId(null));

    const nodes: SimNode[] = visibleNodes.map(n => ({ ...n }));
    const edges: SimEdge[] = filteredEdges.map(e => ({ ...e })) as SimEdge[];

    // Scale repulsion: sparse graphs need much weaker charge so nodes don't fly apart
    const densityScale = Math.min(1, nodes.length / 25);
    const chargeBase   = -120 - densityScale * 200; // stronger repulsion = more breathing room

    const sim = d3.forceSimulation<SimNode>(nodes)
      .force('link', d3.forceLink<SimNode, SimEdge>(edges)
        .id(d => d.id)
        .distance(d => {
          const e = d as GraphEdge & { strength?: number };
          const base = e.type === 'foundry' ? 120 : e.type === 'supplier' ? 140 : 160;
          return base + (10 - (e.strength ?? 5)) * 8;
        })
        .strength(d => 0.18 + ((d as SimEdge).strength ?? 5) / 28))
      .force('charge', d3.forceManyBody().strength((n) => chargeBase - (n as SimNode).importance * 25 * densityScale))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide((n) => nodeRadius((n as SimNode).importance) + 22))
      .alphaDecay(0.015);
    simRef.current = sim;

    // ── Edges ───────────────────────────────────────────────────────────────
    // Slight curve — just enough to distinguish parallel edges, not so much it looks chaotic
    function calcPath(d: SimEdge): string {
      const sx = (d.source as SimNode).x ?? 0, sy = (d.source as SimNode).y ?? 0;
      const tx = (d.target as SimNode).x ?? 0, ty = (d.target as SimNode).y ?? 0;
      const dx = tx - sx, dy = ty - sy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const curve = Math.min(16, len * 0.06); // very subtle arc
      const cx = (sx + tx) / 2 - (dy / len) * curve;
      const cy = (sy + ty) / 2 + (dx / len) * curve;
      return `M${sx},${sy} Q${cx},${cy} ${tx},${ty}`;
    }

    // Visible edge paths
    const edgeSel = g.append('g').attr('class', 'edges')
      .selectAll<SVGPathElement, SimEdge>('path')
      .data(edges).join('path')
      .attr('fill', 'none')
      .attr('stroke',           d => EDGE_STYLE[d.type]?.color ?? '#475569')
      .attr('stroke-width',     d => edgeWidth(d.strength))
      .attr('stroke-dasharray', d => EDGE_STYLE[d.type]?.dash ?? 'none')
      .attr('stroke-linecap', 'round')
      .attr('opacity', 0.4)
      .attr('marker-end', d => `url(#arrow-${d.type})`)
      .attr('pointer-events', 'none');

    // Edge type labels — shown on hover
    const edgeLabelSel = g.append('g').attr('class', 'edge-labels')
      .selectAll<SVGTextElement, SimEdge>('text')
      .data(edges).join('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '8px')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-weight', '700')
      .attr('letter-spacing', '0.05em')
      .attr('pointer-events', 'none')
      .attr('opacity', 0)
      .text(d => EDGE_STYLE[d.type]?.label ?? d.type)
      .style('fill', d => EDGE_STYLE[d.type]?.color ?? '#94a3b8');

    // Invisible wider hit-area paths on top (for easy hover) — declared after edgeSel/edgeLabelSel
    g.append('g').attr('class', 'edge-hit')
      .selectAll<SVGPathElement, SimEdge>('path')
      .data(edges).join('path')
      .attr('fill', 'none').attr('stroke', 'transparent').attr('stroke-width', 14)
      .style('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        edgeSel.filter((e: SimEdge) => e === d)
          .attr('opacity', 1)
          .attr('stroke-width', edgeWidth(d.strength) + 2)
          .attr('marker-end', `url(#arrow-${d.type}-hi)`);
        edgeLabelSel.filter((e: SimEdge) => e === d).attr('opacity', 1);
        const [mx, my] = d3.pointer(event, svgRef.current);
        setTooltip({ x: mx, y: my, edge: { ...d, _label: d.label, _type: d.type } as never });
      })
      .on('mouseleave', function(_, d) {
        edgeSel.filter((e: SimEdge) => e === d)
          .attr('opacity', 0.55)
          .attr('stroke-width', edgeWidth(d.strength))
          .attr('marker-end', `url(#arrow-${d.type})`);
        edgeLabelSel.filter((e: SimEdge) => e === d).attr('opacity', 0);
        setTooltip(null);
      });

    edgeSelRef.current = edgeSel as unknown as d3.Selection<SVGLineElement, SimEdge, SVGGElement, unknown>;

    // ── Nodes ───────────────────────────────────────────────────────────────
    const nodeSel = g.append('g')
      .selectAll<SVGGElement, SimNode>('g').data(nodes).join('g')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, SimNode>()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }))
      .on('mouseenter', function(event, d) {
        d3.select(this).select('.node-circle').attr('r', nodeRadius(d.importance) + 4);
        const [mx, my] = d3.pointer(event, svgRef.current);
        setTooltip({ x: mx, y: my, node: d });
        setHoveredNodeId(d.id);
        // Failure impact overlay — show scores on affected nodes without clicking
        const impact = propagateImpact(d.id, 'disruption', edges as unknown as GraphEdge[], 2);
        nodeSel.each(function(nd) {
          const imp = impact.get(nd.id);
          if (imp && imp.direction !== 'origin' && Math.abs(imp.score) > 0.08) {
            d3.select(this).select('.impact-badge').remove();
            d3.select(this).append('text')
              .attr('class', 'impact-badge')
              .attr('text-anchor', 'middle')
              .attr('y', -(nodeRadius(nd.importance) + 10))
              .attr('font-size', '8px')
              .attr('font-family', 'JetBrains Mono, monospace')
              .attr('font-weight', '900')
              .attr('pointer-events', 'none')
              .attr('fill', scoreColor(imp.score))
              .text(`${imp.score > 0 ? '+' : ''}${(imp.score * 100).toFixed(0)}%`);
          }
        });
      })
      .on('mouseleave', function(_, d) {
        d3.select(this).select('.node-circle').attr('r', nodeRadius(d.importance));
        setTooltip(null); setHoveredNodeId(null);
        nodeSel.selectAll('.impact-badge').remove();
      })
      .on('click', function(event, d) {
        event.stopPropagation();
        if (scenarioActiveRef.current) {
          setScenarioOrigin(d.id);
        } else {
          setSelectedNodeId(prev => prev === d.id ? null : d.id);
        }
      });

    // Risk ring
    nodeSel.append('circle').attr('class', 'risk-ring')
      .attr('r', d => nodeRadius(d.importance) + 3.5)
      .attr('fill', 'none')
      .attr('stroke', d => RISK_RING[d.risk])
      .attr('stroke-width', d => d.risk === 'critical' ? 2.5 : d.risk === 'high' ? 1.5 : 1)
      .attr('opacity', d => d.risk === 'low' ? 0 : d.risk === 'critical' ? 0.85 : 0.55)
      .attr('stroke-dasharray', d => d.risk === 'critical' ? '4,2' : 'none');

    // Main circle — fill encodes risk level, not just portfolio color
    nodeSel.append('circle').attr('class', 'node-circle')
      .attr('r', d => nodeRadius(d.importance))
      .attr('fill', d => {
        if (d.risk === 'critical') return '#ff174418';
        if (d.risk === 'high')     return '#ff980015';
        return `${d.color}14`;
      })
      .attr('stroke', d => d.risk === 'critical' ? '#ff174480' : d.risk === 'high' ? '#ff980070' : d.color)
      .attr('stroke-width', d => d.portfolio === 'dynamic' ? 2 : d.risk === 'critical' ? 2 : 1.5);

    // Ticker
    nodeSel.append('text').text(d => d.id)
      .attr('text-anchor', 'middle').attr('dy', '0.35em')
      .attr('font-size', d => `${Math.max(7, Math.min(10, nodeRadius(d.importance) * 0.6))}px`)
      .attr('font-family', 'JetBrains Mono, monospace').attr('font-weight', '700')
      .attr('fill', d => d.color).attr('letter-spacing', '0.04em').attr('pointer-events', 'none');

    // Company label
    nodeSel.append('text').text(d => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', d => `${nodeRadius(d.importance) + 12}px`)
      .attr('font-size', '7px').attr('font-family', 'Inter, sans-serif')
      .attr('fill', '#6b7a94').attr('pointer-events', 'none');

    // SoWhat badge — only for monopoly or critical risk nodes
    nodeSel.filter(d => d.monopoly || d.risk === 'critical').append('text')
      .attr('class', 'so-what-badge')
      .attr('text-anchor', 'middle')
      .attr('dy', d => `${nodeRadius(d.importance) + 22}px`)
      .attr('font-size', '6px').attr('font-family', 'Inter, sans-serif')
      .attr('font-weight', '900').attr('letter-spacing', '0.07em')
      .attr('pointer-events', 'none')
      .attr('fill', d => d.monopoly ? '#ff1744' : '#ff5722')
      .text(d => d.monopoly ? '● SOLE SOURCE' : '⚠ CRITICAL');

    nodeSelRef.current = nodeSel as unknown as d3.Selection<SVGGElement, SimNode, SVGGElement, unknown>;

    sim.on('tick', () => {
      // Update curved edge paths
      edgeSel.attr('d', (d: SimEdge) => calcPath(d));
      // Update hit areas
      g.select<SVGGElement>('.edge-hit').selectAll<SVGPathElement, SimEdge>('path')
        .attr('d', (d: SimEdge) => calcPath(d));
      // Update edge labels to midpoint
      edgeLabelSel.attr('x', (d: SimEdge) => {
        const sx = (d.source as SimNode).x ?? 0, sy = (d.source as SimNode).y ?? 0;
        const tx = (d.target as SimNode).x ?? 0, ty = (d.target as SimNode).y ?? 0;
        const dx = tx - sx, dy = ty - sy;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const curve = Math.min(40, len * 0.18);
        return (sx + tx) / 2 - (dy / len) * curve;
      }).attr('y', (d: SimEdge) => {
        const sx = (d.source as SimNode).x ?? 0, sy = (d.source as SimNode).y ?? 0;
        const tx = (d.target as SimNode).x ?? 0, ty = (d.target as SimNode).y ?? 0;
        const dx = tx - sx, dy = ty - sy;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const curve = Math.min(40, len * 0.18);
        return (sy + ty) / 2 + (dx / len) * curve;
      });
      nodeSel.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Auto-fit to actual node bounds after simulation settles
    setTimeout(() => {
      const xs = nodes.map(n => n.x ?? 0);
      const ys = nodes.map(n => n.y ?? 0);
      if (!xs.length) return;
      const pad = 60;
      const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad;
      const minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
      const scaleX = W / (maxX - minX), scaleY = H / (maxY - minY);
      const scale  = Math.min(scaleX, scaleY, 1.4); // never zoom in past 1.4×
      const tx = W / 2 - scale * (minX + maxX) / 2;
      const ty = H / 2 - scale * (minY + maxY) / 2;
      svg.transition().duration(600).call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    }, 1200);
  }, [visibleNodes, filteredEdges]);

  useEffect(() => {
    if (!svgRef.current) return;
    setSelectedNodeId(null); setImpactMap(null);
    buildGraph();
    return () => { simRef.current?.stop(); };
  }, [buildGraph]);

  // ── Selection visual update ───────────────────────────────────────────────
  useEffect(() => {
    const ns = nodeSelRef.current; const es = edgeSelRef.current;
    if (!ns || !es || impactMap) return;
    if (!selectedNodeId) {
      if (graphMode === 'risk') {
        // Risk View: spotlight top-8 critical nodes, ghost the rest
        ns.each(function(d: SimNode) {
          const top  = riskModeIds.has(d.id);
          const rank = riskModeNodes.findIndex(n => n.id === d.id);
          d3.select(this).select('.node-circle').attr('opacity', top ? 1 : 0.06).attr('stroke-width', d.portfolio === 'dynamic' ? 2 : 1.5).attr('filter', top ? 'url(#glow)' : null).attr('r', nodeRadius(d.importance)).attr('stroke', d.color).attr('fill', `${d.color}${top ? '22' : '06'}`);
          d3.select(this).selectAll('text').attr('opacity', top ? 1 : 0.06);
          d3.select(this).select('.risk-ring').attr('opacity', top ? (d.risk === 'low' ? 0 : d.risk === 'critical' ? 0.9 : 0.6) : 0.04);
          // Rank labels R1/R2/R3 for top-3
          d3.select(this).select('.rank-label').remove();
          if (top && rank < 3) {
            const rankColors = ['#ff1744', '#ff5722', '#ff9800'];
            d3.select(this).append('text')
              .attr('class', 'rank-label')
              .attr('text-anchor', 'middle')
              .attr('y', -(nodeRadius(d.importance) + 15))
              .attr('font-size', '9px')
              .attr('font-family', 'JetBrains Mono, monospace')
              .attr('font-weight', '900')
              .attr('letter-spacing', '0.05em')
              .attr('pointer-events', 'none')
              .attr('fill', rankColors[rank])
              .text(`R${rank + 1}`);
          }
        });
        es.attr('opacity', (d: SimEdge) => {
          const src = typeof d.source === 'string' ? d.source : (d.source as SimNode).id;
          const tgt = typeof d.target === 'string' ? d.target : (d.target as SimNode).id;
          return riskModeIds.has(src) && riskModeIds.has(tgt) ? 0.5 : 0.03;
        }).attr('stroke-width', (d: SimEdge) => edgeWidth(d.strength));
      } else if (graphMode === 'dependency') {
        // Dependency Mode: edge width/color = concentration, nodes normal
        ns.selectAll('.rank-label').remove();
        ns.select('.node-circle').attr('opacity', 1).attr('filter', null).attr('r', (d: SimNode) => nodeRadius(d.importance));
        ns.selectAll('text').attr('opacity', 1);
        ns.select('.risk-ring').attr('opacity', (d: SimNode) => d.risk === 'low' ? 0 : d.risk === 'critical' ? 0.85 : 0.55);
        es.attr('stroke', (d: SimEdge) => {
          const c = d.concentration;
          return c > 0.7 ? '#ff1744' : c > 0.4 ? '#ff9800' : '#4ade80';
        })
        .attr('stroke-width', (d: SimEdge) => Math.max(0.5, d.concentration * 7))
        .attr('opacity', 0.75)
        .attr('stroke-dasharray', 'none');
      } else if (graphMode === 'financial') {
        // Financial Mode: node size = RaR, fill = DPS color
        ns.selectAll('.rank-label').remove();
        ns.each(function(d: SimNode) {
          const intel  = NODE_INTELLIGENCE[d.id];
          const rar    = intel?.financialExposure?.revenueAtRisk ?? 0;
          const dps    = intel?.disruption?.dps12m ?? 0;
          const fillC  = dps >= 0.5 ? '#ff1744' : dps >= 0.25 ? '#ff9800' : dps >= 0.1 ? '#ffeb3b' : d.color;
          const r      = rar > 0 ? Math.min(32, 8 + rar * 0.35) : nodeRadius(d.importance);
          d3.select(this).select('.node-circle')
            .attr('opacity', 1).attr('filter', rar > 20 ? 'url(#glow)' : null)
            .attr('r', r).attr('fill', `${fillC}22`).attr('stroke', fillC).attr('stroke-width', rar > 20 ? 2.5 : 1.5);
          d3.select(this).selectAll('text').attr('opacity', 1);
          d3.select(this).select('.risk-ring').attr('opacity', d.risk === 'low' ? 0 : 0.6);
          // Dollar badge for high-exposure nodes
          d3.select(this).select('.fin-badge').remove();
          if (rar >= 10) {
            d3.select(this).append('text').attr('class', 'fin-badge')
              .attr('text-anchor', 'middle').attr('y', -(r + 12))
              .attr('font-size', '7px').attr('font-family', 'JetBrains Mono, monospace')
              .attr('font-weight', '900').attr('pointer-events', 'none')
              .attr('fill', fillC).text(`$${rar.toFixed(0)}B`);
          }
        });
        es.attr('opacity', (d: SimEdge) => {
          const c = d.concentration;
          return c > 0.6 ? 0.8 : 0.2;
        }).attr('stroke', (d: SimEdge) => {
          const c = d.concentration;
          return c > 0.7 ? '#ff1744' : c > 0.4 ? '#ff9800' : '#4ade80';
        }).attr('stroke-width', (d: SimEdge) => Math.max(0.5, d.concentration * 6));
      } else if (graphMode === 'capacity') {
        // Capacity Mode: node color = utilization (green → red)
        ns.selectAll('.rank-label').remove();
        ns.each(function(d: SimNode) {
          const cap  = NODE_INTELLIGENCE[d.id]?.capacity;
          const u    = cap?.utilization ?? 0;
          const fillC = u >= 90 ? '#ff1744' : u >= 80 ? '#ff9800' : u >= 70 ? '#ffeb3b' : u > 0 ? '#4ade80' : '#475569';
          const r    = nodeRadius(d.importance);
          d3.select(this).select('.node-circle')
            .attr('opacity', u > 0 ? 1 : 0.35).attr('filter', u >= 90 ? 'url(#glow)' : null)
            .attr('r', r).attr('fill', `${fillC}20`).attr('stroke', fillC)
            .attr('stroke-width', u >= 90 ? 2.5 : 1.5);
          d3.select(this).selectAll('text').attr('opacity', 1);
          d3.select(this).select('.risk-ring').attr('opacity', 0.3);
          d3.select(this).select('.cap-badge').remove();
          if (u >= 80) {
            d3.select(this).append('text').attr('class', 'cap-badge')
              .attr('text-anchor', 'middle').attr('y', -(r + 12))
              .attr('font-size', '7px').attr('font-family', 'JetBrains Mono, monospace')
              .attr('font-weight', '900').attr('pointer-events', 'none')
              .attr('fill', fillC).text(`${u}%`);
          }
        });
        es.attr('opacity', 0.3).attr('stroke-width', (d: SimEdge) => edgeWidth(d.strength))
          .attr('stroke', (d: SimEdge) => EDGE_STYLE[d.type]?.color ?? '#475569');
      } else {
        ns.selectAll('.rank-label').remove();
        ns.select('.node-circle').attr('opacity', 1).attr('stroke-width', (d: SimNode) => d.portfolio === 'dynamic' ? 2 : d.risk === 'critical' ? 2 : 1.5).attr('filter', null).attr('r', (d: SimNode) => nodeRadius(d.importance));
        ns.selectAll('text').attr('opacity', 1);
        ns.select('.risk-ring').attr('opacity', (d: SimNode) => d.risk === 'low' ? 0 : d.risk === 'critical' ? 0.85 : 0.55);
        es.attr('opacity', 0.4).attr('stroke-width', (d: SimEdge) => edgeWidth(d.strength)).attr('stroke', (d: SimEdge) => EDGE_STYLE[d.type]?.color ?? '#475569');
      }
      return;
    }
    ns.selectAll('.rank-label').remove();
    ns.selectAll('.fin-badge').remove();
    ns.selectAll('.cap-badge').remove();
    const connected = new Set<string>([selectedNodeId]);
    es.each(function(d: SimEdge) {
      const src = typeof d.source === 'string' ? d.source : (d.source as SimNode).id;
      const tgt = typeof d.target === 'string' ? d.target : (d.target as SimNode).id;
      if (src === selectedNodeId || tgt === selectedNodeId) { connected.add(src); connected.add(tgt); }
    });
    es.each(function(d: SimEdge) {
      const src = typeof d.source === 'string' ? d.source : (d.source as SimNode).id;
      const tgt = typeof d.target === 'string' ? d.target : (d.target as SimNode).id;
      const on = src === selectedNodeId || tgt === selectedNodeId;
      d3.select(this).attr('opacity', on ? 1 : 0.04).attr('stroke-width', on ? edgeWidth(d.strength) + 1.5 : edgeWidth(d.strength));
    });
    ns.each(function(d: SimNode) {
      const on = connected.has(d.id); const sel = d.id === selectedNodeId;
      d3.select(this).select('.node-circle').attr('opacity', on ? 1 : 0.05).attr('stroke-width', sel ? 3 : (d.portfolio === 'dynamic' ? 2 : 1.5)).attr('filter', sel ? 'url(#glow-sel)' : null).attr('r', sel ? nodeRadius(d.importance) + 2 : nodeRadius(d.importance));
      d3.select(this).selectAll('text').attr('opacity', on ? 1 : 0.05);
      d3.select(this).select('.risk-ring').attr('opacity', on ? (d.risk === 'low' ? 0 : d.risk === 'critical' ? 0.85 : 0.55) : 0.03);
    });
  }, [selectedNodeId, impactMap, graphMode, riskModeIds]);

  // ── Scenario visual update ────────────────────────────────────────────────
  useEffect(() => {
    const ns = nodeSelRef.current; const es = edgeSelRef.current;
    if (!ns || !es || !impactMap) return;
    es.attr('opacity', 0.05).attr('stroke-width', (d: SimEdge) => edgeWidth(d.strength));
    ns.each(function(d: SimNode) {
      const impact = impactMap.get(d.id);
      if (!impact) {
        d3.select(this).select('.node-circle').attr('opacity', 0.06).attr('filter', null);
        d3.select(this).selectAll('text').attr('opacity', 0.06);
        return;
      }
      const c = impact.direction === 'origin' ? '#ffffff' : scoreColor(impact.score);
      d3.select(this).select('.node-circle').attr('opacity', 1).attr('stroke', c).attr('stroke-width', impact.direction === 'origin' ? 4 : 2.5).attr('filter', 'url(#glow-impact)').attr('fill', `${c}22`);
      d3.select(this).selectAll('text').attr('opacity', 1);
    });
    es.each(function(d: SimEdge) {
      const src = typeof d.source === 'string' ? d.source : (d.source as SimNode).id;
      const tgt = typeof d.target === 'string' ? d.target : (d.target as SimNode).id;
      if (impactMap.has(src) && impactMap.has(tgt)) {
        d3.select(this).attr('opacity', 0.6).attr('stroke', scoreColor(impactMap.get(tgt)!.score)).attr('stroke-width', edgeWidth(d.strength) + 1.5);
      }
    });
  }, [impactMap]);

  // ── Scenario run ──────────────────────────────────────────────────────────
  const runScenario = useCallback(() => {
    if (!scenarioOrigin) return;
    setImpactMap(propagateImpact(scenarioOrigin, scenarioType, allEdges, scenarioHops));
  }, [scenarioOrigin, scenarioType, allEdges, scenarioHops]);

  const clearScenario = useCallback(() => {
    setImpactMap(null); setScenarioOrigin('');
    const ns = nodeSelRef.current; const es = edgeSelRef.current;
    if (!ns || !es) return;
    ns.select('.node-circle').attr('opacity', 1).attr('filter', null).attr('stroke', (d: SimNode) => d.risk === 'critical' ? '#ff174480' : d.risk === 'high' ? '#ff980070' : d.color).attr('fill', (d: SimNode) => d.risk === 'critical' ? '#ff174418' : d.risk === 'high' ? '#ff980015' : `${d.color}14`).attr('stroke-width', (d: SimNode) => d.portfolio === 'dynamic' ? 2 : d.risk === 'critical' ? 2 : 1.5).attr('r', (d: SimNode) => nodeRadius(d.importance));
    ns.selectAll('text').attr('opacity', 1);
    ns.select('.risk-ring').attr('opacity', (d: SimNode) => d.risk === 'low' ? 0 : d.risk === 'critical' ? 0.85 : 0.55);
    es.attr('opacity', 0.4).attr('stroke', (d: SimEdge) => EDGE_STYLE[d.type]?.color ?? '#475569').attr('stroke-width', (d: SimEdge) => edgeWidth(d.strength));
  }, []);

  // ── Zoom ──────────────────────────────────────────────────────────────────
  const zoomIn    = () => svgRef.current && zoomRef.current && d3.select(svgRef.current).call(zoomRef.current.scaleBy, 1.4);
  const zoomOut   = () => svgRef.current && zoomRef.current && d3.select(svgRef.current).call(zoomRef.current.scaleBy, 0.7);
  const resetZoom = () => svgRef.current && zoomRef.current && d3.select(svgRef.current).call(zoomRef.current.transform, d3.zoomIdentity.scale(0.8));

  const PORTFOLIOS = ['all', 'ai', 'robotics', 'watchlist', 'multi', 'nvidia-sc'];
  const EDGE_TYPES = ['all', 'supplier', 'foundry', 'material', 'customer', 'technology', 'power', 'testing'];
  const RISKS      = ['all', 'critical', 'high', 'medium', 'low'];
  const RISK_COLORS: Record<string, string> = { critical: '#ff1744', high: '#ff9800', medium: '#ffeb3b', low: '#34d399', all: '#00d4ff' };

  const hoveredConns = hoveredNodeId ? EDGES.filter(e => e.source === hoveredNodeId || e.target === hoveredNodeId).length : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 48px)' }}>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-primary bg-bg-secondary/90 flex-wrap" style={{ overflow: 'visible' }}>

        {/* AI Search */}
        <div ref={searchRef} className="relative">
          <div className="flex items-center gap-1.5 bg-bg-tertiary border border-border-secondary rounded-lg px-2.5 py-1.5">
            <Search className="w-3 h-3 text-text-muted flex-shrink-0" />
            <input
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Ticker or company name…"
              className="bg-transparent text-[11px] text-text-primary placeholder-text-muted focus:outline-none w-36"
            />
            {searchLoading && <div className="w-3 h-3 border border-accent-cyan/40 border-t-accent-cyan rounded-full animate-spin flex-shrink-0" />}
            {aiLoading && <span className="text-[9px] text-accent-purple animate-pulse">AI…</span>}
          </div>

          {/* Search dropdown */}
          {searchQuery.length >= 2 && (
            <div className="absolute top-full left-0 mt-1 w-72 border border-border-secondary rounded-lg overflow-hidden shadow-2xl animate-fade-in"
              style={{ background: 'rgba(10,15,30,0.98)', backdropFilter: 'blur(20px)', zIndex: 9999 }}>
              {searchLoading ? (
                <div className="px-3 py-4 flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" />
                  <span className="text-[10px] text-text-muted">Searching…</span>
                </div>
              ) : searchResults.length > 0 ? (
                <>
                  <div className="px-3 py-1.5 border-b border-border-primary/40 text-[9px] text-text-muted font-bold uppercase tracking-widest">
                    Select a stock to generate its supply chain
                  </div>
                  {searchResults.map(r => (
                    <button key={r.symbol}
                      className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/[0.04] transition-colors text-left border-b border-border-primary/20 last:border-0"
                      onClick={() => loadAISupplyChain(r.symbol, r.description)}>
                      <span className="font-mono font-bold text-[11px] text-accent-cyan w-16 flex-shrink-0">{r.symbol}</span>
                      <span className="text-[10px] text-text-secondary truncate flex-1">{r.description}</span>
                      <span className="text-[9px] text-accent-purple flex-shrink-0 font-bold">AI ✦</span>
                    </button>
                  ))}
                </>
              ) : (
                <div className="px-3 py-4 text-center">
                  <div className="text-[11px] text-text-muted">No results for <span className="font-mono text-text-secondary">"{searchQuery.toUpperCase()}"</span></div>
                  <div className="text-[9px] text-text-muted/60 mt-1">Try a ticker or company name (e.g. NVDA, Apple, Taiwan Semi)</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dynamic label */}
        {dynLabel && (
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border" style={{ background: '#e879f920', borderColor: '#e879f950', color: '#e879f9' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {dynLabel}
              <button onClick={() => { setDynNodes([]); setDynEdges([]); setDynLabel(''); setShowChainMap(false); }} className="ml-1 opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
            </div>
            <button
              onClick={() => setShowChainMap(v => !v)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${showChainMap ? 'border-accent-purple/60 bg-accent-purple/15 text-accent-purple' : 'border-border-primary text-text-muted hover:text-text-secondary'}`}
              title="Chain Map — categorised view"
            >
              <LayoutList className="w-3 h-3" /> Chain Map
            </button>
          </div>
        )}

        {aiError && <span className="text-[10px] text-accent-red">{aiError}</span>}

        <div className="w-px h-4 bg-border-primary" />

        {/* Portfolio filter */}
        <div className="flex items-center gap-1">
          {PORTFOLIOS.map(p => (
            <button key={p} onClick={() => setSelectedPortfolio(p)}
              className={`px-2 py-1 text-[10px] font-bold rounded transition-all uppercase tracking-wide ${selectedPortfolio === p ? 'text-bg-primary' : 'text-text-muted border border-border-primary hover:text-text-secondary'}`}
              style={selectedPortfolio === p ? { background: PORTFOLIO_COLORS[p] || '#00d4ff' } : {}}>
              {PTLABELS[p]}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-border-primary" />

        {/* Full chain toggle */}
        <button onClick={() => setShowExtended(v => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all border ${showExtended ? 'bg-accent-cyan/15 border-accent-cyan/40 text-accent-cyan' : 'border-border-primary text-text-muted hover:text-text-secondary'}`}>
          <Layers className="w-3 h-3" />
          {showExtended ? 'Full Chain' : 'My Portfolio'}
        </button>

        <div className="w-px h-4 bg-border-primary" />

        {/* Edge type filter */}
        <div className="flex items-center gap-1">
          <Filter className="w-3 h-3 text-text-muted" />
          {EDGE_TYPES.map(t => (
            <button key={t} onClick={() => setSelectedEdgeType(t)}
              className={`px-1.5 py-0.5 text-[9px] font-mono rounded transition-all ${selectedEdgeType === t ? 'text-bg-primary bg-accent-cyan' : 'text-text-muted border border-border-primary hover:text-text-secondary'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-border-primary hidden lg:block" />

        {/* Risk filter */}
        <div className="items-center gap-1 hidden lg:flex">
          <AlertTriangle className="w-3 h-3 text-text-muted" />
          {RISKS.map(r => (
            <button key={r} onClick={() => setSelectedRisk(r)}
              className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase transition-all ${selectedRisk === r ? 'text-bg-primary' : 'text-text-muted border border-border-primary hover:text-text-secondary'}`}
              style={selectedRisk === r ? { background: RISK_COLORS[r] } : {}}>
              {r}
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-text-muted">{visibleNodes.length}n · {filteredEdges.length}e</span>
          <div className="flex items-center gap-1 rounded-lg border border-border-primary overflow-hidden">
            <button
              onClick={() => { setGraphMode('network'); setSelectedNodeId(null); }}
              className={`px-2 py-1.5 text-[9px] font-bold transition-all ${graphMode === 'network' ? 'bg-accent-cyan/15 text-accent-cyan' : 'text-text-muted hover:text-text-secondary'}`}
              title="Network View"
            >Network</button>
            <button
              onClick={() => { setGraphMode(m => m === 'risk' ? 'network' : 'risk'); setSelectedNodeId(null); }}
              className={`flex items-center gap-1 px-2 py-1.5 text-[9px] font-bold transition-all border-l border-border-primary ${graphMode === 'risk' ? 'bg-accent-red/15 text-accent-red' : 'text-text-muted hover:text-accent-red/70'}`}
              title="Risk View — spotlight top 8 critical nodes"
            ><Eye className="w-3 h-3" />Risk</button>
            <button
              onClick={() => { setGraphMode(m => m === 'financial' ? 'network' : 'financial'); setSelectedNodeId(null); }}
              className={`flex items-center gap-1 px-2 py-1.5 text-[9px] font-bold transition-all border-l border-border-primary ${graphMode === 'financial' ? 'bg-accent-green/15 text-accent-green' : 'text-text-muted hover:text-accent-green/70'}`}
              title="Financial Mode — node size = Revenue at Risk, color = disruption probability"
            ><BarChart2 className="w-3 h-3" />Financial</button>
            <button
              onClick={() => { setGraphMode(m => m === 'capacity' ? 'network' : 'capacity'); setSelectedNodeId(null); }}
              className={`flex items-center gap-1 px-2 py-1.5 text-[9px] font-bold transition-all border-l border-border-primary ${graphMode === 'capacity' ? 'bg-accent-purple/15 text-accent-purple' : 'text-text-muted hover:text-accent-purple/70'}`}
              title="Capacity Mode — node color = utilization stress"
            ><Activity className="w-3 h-3" />Capacity</button>
            <button
              onClick={() => { setGraphMode(m => m === 'dependency' ? 'network' : 'dependency'); setSelectedNodeId(null); }}
              className={`px-2 py-1.5 text-[9px] font-bold transition-all border-l border-border-primary ${graphMode === 'dependency' ? 'bg-accent-yellow/15 text-accent-yellow' : 'text-text-muted hover:text-accent-yellow/70'}`}
              title="Dependency Mode — edge width = concentration risk"
            >Dep.</button>
          </div>
          <button onClick={() => { setScenarioActive(v => !v); if (scenarioActive) clearScenario(); }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${scenarioActive ? 'bg-accent-red/15 border-accent-red/40 text-accent-red' : 'border-border-primary text-text-muted hover:text-accent-yellow hover:border-accent-yellow/30'}`}>
            <Zap className="w-3 h-3" />{scenarioActive ? 'Exit' : 'Scenario'}
          </button>
          <button onClick={zoomIn}    className="w-7 h-7 flex items-center justify-center rounded border border-border-primary text-text-muted hover:text-text-primary transition-colors"><ZoomIn    className="w-3.5 h-3.5" /></button>
          <button onClick={zoomOut}   className="w-7 h-7 flex items-center justify-center rounded border border-border-primary text-text-muted hover:text-text-primary transition-colors"><ZoomOut   className="w-3.5 h-3.5" /></button>
          <button onClick={resetZoom} className="w-7 h-7 flex items-center justify-center rounded border border-border-primary text-text-muted hover:text-text-primary transition-colors"><Maximize2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* ── Scenario bar ────────────────────────────────────────────────── */}
      {scenarioActive && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-accent-yellow/20 flex-wrap animate-fade-in" style={{ background: 'rgba(251,146,60,0.06)' }}>
          <Zap className="w-3.5 h-3.5 text-accent-yellow" />
          <span className="text-[10px] font-bold text-accent-yellow uppercase tracking-widest">Scenario</span>
          <div className="relative">
            <select value={scenarioType} onChange={e => setScenarioType(e.target.value as ScenarioType)}
              className="bg-bg-tertiary border border-border-secondary text-[10px] font-bold text-text-primary rounded px-2 py-1 pr-6 appearance-none focus:outline-none cursor-pointer">
              {(Object.keys(SCENARIO_META) as ScenarioType[]).map(s => <option key={s} value={s}>{SCENARIO_META[s].label}</option>)}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
          </div>
          <span className="text-[9px] text-text-muted">at</span>
          <div className="relative">
            <select value={scenarioOrigin} onChange={e => setScenarioOrigin(e.target.value)}
              className="bg-bg-tertiary border border-border-secondary text-[10px] font-bold text-text-primary rounded px-2 py-1 pr-6 appearance-none focus:outline-none cursor-pointer min-w-[110px]">
              <option value="">— pick or click node —</option>
              {allNodes.filter(n => filteredNodes.some(f => f.id === n.id)).map(n => <option key={n.id} value={n.id}>{n.id} — {n.label}</option>)}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
          </div>
          <span className="text-[9px] text-text-muted">hops</span>
          {[1,2,3].map(h => (
            <button key={h} onClick={() => setScenarioHops(h)}
              className={`w-6 h-6 text-[10px] font-bold rounded transition-all ${scenarioHops === h ? 'bg-accent-yellow text-bg-primary' : 'border border-border-primary text-text-muted hover:text-text-primary'}`}>{h}</button>
          ))}
          <button onClick={runScenario} disabled={!scenarioOrigin}
            className="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all disabled:opacity-30"
            style={{ background: scenarioOrigin ? SCENARIO_META[scenarioType].color : '#1e293b', color: scenarioOrigin ? '#fff' : '#64748b', border: '1px solid transparent' }}>
            Run Analysis
          </button>
          {impactMap && <button onClick={clearScenario} className="px-2.5 py-1.5 text-[10px] text-text-muted border border-border-primary rounded-lg hover:text-text-primary"><X className="w-3 h-3 inline mr-1" />Clear</button>}
          {!scenarioOrigin && <span className="text-[9px] text-text-muted italic">↑ click a node on the graph to set origin</span>}
        </div>
      )}

      {/* ── Chain Map overlay ────────────────────────────────────────── */}
      {showChainMap && dynNodes.length > 0 && (() => {
        // Build category → nodes map from edges
        const mainId = dynNodes.find(n => n.portfolio === 'dynamic')?.id ?? '';

        // Group by edge type: collect unique nodes per type
        const categories: Record<string, { nodes: GraphNode[]; edgeLabel: string }> = {};
        dynEdges.forEach(e => {
          const type = e.type as string;
          if (!categories[type]) categories[type] = { nodes: [], edgeLabel: EDGE_STYLE[e.type as EdgeType]?.label ?? type };
          // Add source and target (excluding the main searched company to avoid self-listing)
          [e.source, e.target].forEach(id => {
            const node = dynNodes.find(n => n.id === id);
            if (node && node.id !== mainId && !categories[type].nodes.find(n => n.id === node.id)) {
              categories[type].nodes.push(node);
            }
          });
        });

        const mainNode = dynNodes.find(n => n.id === mainId);

        return (
          <div className="border-b border-border-primary overflow-y-auto flex-shrink-0" style={{ maxHeight: '42vh', background: 'rgba(8,12,24,0.98)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-primary/60 sticky top-0 z-10" style={{ background: 'rgba(8,12,24,0.98)' }}>
              <div className="flex items-center gap-2">
                <LayoutList className="w-3.5 h-3.5 text-accent-purple" />
                <span className="text-xs font-black text-text-primary">{dynLabel} — Supply Chain Map</span>
                {mainNode?.note && <span className="text-[10px] text-text-muted hidden md:block truncate max-w-xs">{mainNode.note}</span>}
              </div>
              <button onClick={() => setShowChainMap(false)} className="text-text-muted hover:text-text-primary transition-colors"><X className="w-3.5 h-3.5" /></button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border-primary/40">
                    <th className="px-4 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-widest w-36">Role in Chain</th>
                    <th className="px-4 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-widest">Companies</th>
                    <th className="px-4 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-widest w-40 hidden lg:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Main company row */}
                  <tr className="border-b border-border-primary/20 bg-accent-purple/5">
                    <td className="px-4 py-2.5 text-[10px] font-bold text-accent-purple">Focus Company</td>
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-flex items-center gap-1 font-mono font-black text-[11px] px-2 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ background: '#e879f922', color: '#e879f9', border: '1px solid #e879f940' }}
                        onClick={() => { setSelectedNodeId(mainId); setShowChainMap(false); }}
                      >
                        {mainId}
                        {mainNode && <span className="font-normal text-[9px] opacity-70">{mainNode.label}</span>}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 hidden lg:table-cell">
                      {mainNode?.note && <span className="text-[9px] text-text-muted italic">{mainNode.note}</span>}
                    </td>
                  </tr>
                  {Object.entries(categories).filter(([, { nodes }]) => nodes.length > 0).map(([type, { nodes, edgeLabel }]) => {
                    const style = EDGE_STYLE[type as EdgeType];
                    const color = style?.color ?? '#94a3b8';
                    return (
                      <tr key={type} className="border-b border-border-primary/20 hover:bg-white/[0.015] transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-0.5 rounded-full flex-shrink-0" style={{ background: color }} />
                            <span className="text-[10px] font-bold" style={{ color }}>{edgeLabel}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            {nodes.map(node => (
                              <button
                                key={node.id}
                                onClick={() => { setSelectedNodeId(node.id); setShowChainMap(false); }}
                                className="inline-flex items-center gap-1 font-mono font-black text-[10px] px-2 py-0.5 rounded transition-all hover:scale-105"
                                style={{ background: `${node.color ?? color}18`, color: node.color ?? color, border: `1px solid ${node.color ?? color}40` }}
                                title={node.note ?? node.label}
                              >
                                {node.id}
                                <span className="font-normal text-[8px] opacity-60 hidden sm:inline">{node.label}</span>
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 hidden lg:table-cell">
                          <span className="text-[9px] text-text-muted italic">
                            {nodes[0]?.note ?? ''}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ── Command Strip ───────────────────────────────────────────────── */}
      <CommandStrip nodes={filteredNodes} edges={filteredEdges} onNodeSelect={id => { setSelectedNodeId(id); setGraphMode('network'); }} />

      {/* ── Canvas + Panel ──────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at 50% 40%, #0e1628 0%, #080c18 100%)' }}>

          {/* Persistent micro-legend bar */}
          {showMicroLegend && (
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-4 px-3 py-1.5 border-b border-border-primary/30"
              style={{ background: 'rgba(8,12,24,0.90)', backdropFilter: 'blur(8px)' }}>
              <div className="flex items-center gap-3 flex-1 flex-wrap">
                {[
                  { dot: <div className="w-3 h-3 rounded-full border-2 flex-shrink-0" style={{ borderColor: '#ff1744' }} />, label: 'Critical ring = geopolitical/supply risk' },
                  { dot: <div className="text-[10px] font-black flex-shrink-0" style={{ color: '#ff1744' }}>● SOLE</div>, label: 'Sole source = no substitute' },
                  { dot: <svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3" stroke="#ff9800" strokeWidth="3" strokeLinecap="round" /></svg>, label: 'Edge thickness = concentration %' },
                  { dot: <span className="text-[9px] font-black font-mono" style={{ color: '#ff1744' }}>R1</span>, label: 'R1–R3 = risk rank (Risk Mode)' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    {item.dot}
                    <span className="text-[8px] text-text-muted hidden sm:inline">{item.label}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setShowMicroLegend(false); localStorage.setItem('microlegend_dismissed', '1'); }}
                className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <svg ref={svgRef} className="w-full h-full" />

          {/* Tooltip */}
          {tooltip && (
            <div className="absolute pointer-events-none z-20 max-w-xs"
              style={{ left: Math.min(tooltip.x + 16, (svgRef.current?.clientWidth ?? 800) - 340), top: Math.max(8, tooltip.y - 8) }}>
              <div className="glass-card p-3 border border-border-secondary text-xs animate-fade-in shadow-2xl">
                {tooltip.node && (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tooltip.node.color }} />
                      <span className="font-black font-mono text-sm" style={{ color: tooltip.node.color }}>{tooltip.node.id}</span>
                      <span className="text-text-muted text-[10px]">{tooltip.node.label}</span>
                      {tooltip.node.monopoly && <span className="text-[8px] px-1 py-0.5 rounded font-bold" style={{ background: '#ff174420', color: '#ff1744' }}>MONOPOLY</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] mb-2">
                      <span className="text-text-muted">Sector</span><span className="text-text-primary">{tooltip.node.sector}</span>
                      <span className="text-text-muted">Risk</span><span className="font-bold" style={{ color: RISK_RING[tooltip.node.risk] || '#94a3b8' }}>{tooltip.node.risk.toUpperCase()}</span>
                      <span className="text-text-muted">Importance</span><span className="text-accent-cyan font-mono">{tooltip.node.importance}/10</span>
                      <span className="text-text-muted">Region</span><span className="text-text-primary">{tooltip.node.region}</span>
                      <span className="text-text-muted">Connections</span><span className="text-accent-cyan font-mono">{hoveredConns}</span>
                    </div>
                    {tooltip.node.note && <div className="text-[10px] text-text-secondary border-t border-border-primary pt-2 leading-relaxed">{tooltip.node.note}</div>}
                    <div className="mt-1.5 text-[9px] text-text-muted">{scenarioActive && !scenarioOrigin ? '⚡ Click to set scenario origin' : 'Click to explore · right panel shows full supply chain'}</div>
                  </>
                )}
                {tooltip.edge && (
                  <>
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-8 h-0.5 rounded" style={{ background: EDGE_STYLE[tooltip.edge._type]?.color }} />
                      <span className="font-mono font-bold text-[10px] uppercase" style={{ color: EDGE_STYLE[tooltip.edge._type]?.color }}>{tooltip.edge._type}</span>
                      {(tooltip.edge as SimEdge).contractType && (
                        <span className="ml-1 text-[8px] px-1 py-0.5 rounded font-bold"
                          style={{ background: `${CONTRACT_COLORS[(tooltip.edge as SimEdge).contractType!] ?? '#94a3b8'}20`, color: CONTRACT_COLORS[(tooltip.edge as SimEdge).contractType!] ?? '#94a3b8' }}>
                          {(tooltip.edge as SimEdge).contractType}
                        </span>
                      )}
                      <span className="ml-auto text-[8px] font-bold px-1 py-0.5 rounded" style={{ background: `${RISK_RING[tooltip.edge.risk]}20`, color: RISK_RING[tooltip.edge.risk] }}>
                        {tooltip.edge.risk}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-text-primary mb-1">
                      {(tooltip.edge.source as SimNode).id ?? tooltip.edge.source as string}
                      <span className="text-text-muted mx-1.5">→</span>
                      {(tooltip.edge.target as SimNode).id ?? tooltip.edge.target as string}
                    </div>
                    <div className="text-text-secondary text-[10px] mb-2">{tooltip.edge._label}</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                      <span className="text-text-muted">Strength</span><span className="font-mono text-text-primary">{tooltip.edge.strength}/10</span>
                      <span className="text-text-muted">Concentration</span><span className="font-mono text-text-primary">{Math.round(tooltip.edge.concentration * 100)}%</span>
                      <span className="text-text-muted">Substitutable</span>
                      <span className={tooltip.edge.substitutable ? 'text-accent-green' : 'text-accent-red font-bold'}>{tooltip.edge.substitutable ? 'Yes' : 'No — locked in'}</span>
                    </div>
                    {tooltip.edge.value && <div className="mt-2 text-[10px] text-text-secondary border-t border-border-primary pt-1.5 italic leading-relaxed">{tooltip.edge.value}</div>}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Legend — collapsed to "?" button by default */}
          <div className="absolute bottom-4 left-4 z-10">
            <button
              onClick={() => setShowLegend(v => !v)}
              className="w-6 h-6 flex items-center justify-center rounded-full border border-border-primary/60 text-text-muted hover:text-text-primary hover:border-border-secondary transition-colors text-[10px] font-bold"
              style={{ background: 'rgba(8,12,24,0.85)' }}
            >?</button>
            {showLegend && (
              <div className="absolute bottom-8 left-0 glass-card p-3 space-y-3 text-[10px] w-[130px] animate-fade-in">
                <div>
                  <div className="text-[8px] font-bold text-text-muted uppercase tracking-widest mb-1.5">Portfolio</div>
                  {Object.entries(PTLABELS).filter(([k]) => k !== 'all').map(([k, v]) => (
                    <div key={k} className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PORTFOLIO_COLORS[k] }} />
                      <span className="text-text-secondary text-[9px]">{v}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-[8px] font-bold text-text-muted uppercase tracking-widest mb-1.5">Risk ring</div>
                  {(['critical', 'high', 'medium'] as RiskLevel[]).map(r => (
                    <div key={r} className="flex items-center gap-1.5 mb-1">
                      <div className="w-3 h-3 rounded-full border-2 flex-shrink-0" style={{ borderColor: RISK_RING[r] }} />
                      <span className="text-text-secondary text-[9px] capitalize">{r}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  {(Object.entries(EDGE_STYLE) as [EdgeType, { color: string; dash: string; label: string }][]).map(([type, s]) => (
                    <div key={type} className="flex items-center gap-2">
                      <svg width="20" height="6"><line x1="0" y1="3" x2="14" y2="3" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash === 'none' ? undefined : s.dash} strokeLinecap="round" /><polygon points="13,0.5 20,3 13,5.5" fill={s.color} /></svg>
                      <span className="text-[8px]" style={{ color: s.color }}>{s.label}</span>
                    </div>
                  ))}
                </div>
                <div className="text-[8px] text-text-muted">Node size = importance</div>
              </div>
            )}
          </div>

          {/* Scenario impact legend */}
          {impactMap && (
            <div className="absolute top-3 left-3 glass-card p-3 animate-fade-in">
              <div className="text-[9px] font-bold text-accent-yellow uppercase tracking-widest mb-2">
                ⚡ {SCENARIO_META[scenarioType].label} at {scenarioOrigin}
              </div>
              {[['#ff1744','Critical impact'],['#ff5722','Severe'],['#ff9800','Moderate'],['#ffeb3b','Minor'],['#69f0ae','Mild benefit'],['#00e676','Strong benefit']].map(([c, l]) => (
                <div key={c} className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c }} />
                  <span className="text-[9px] text-text-secondary">{l}</span>
                </div>
              ))}
            </div>
          )}

          {!selectedNodeId && !impactMap && !aiLoading && (
            <div className="absolute bottom-4 right-4 text-[9px] text-text-muted font-mono text-right space-y-0.5">
              <div>Drag · Scroll to zoom · Click to explore</div>
              <div className="opacity-50">Search any stock for AI supply chain · Esc to deselect</div>
            </div>
          )}

          {/* AI loading overlay */}
          {aiLoading && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(8,12,24,0.7)' }}>
              <div className="text-center animate-fade-in">
                <div className="w-12 h-12 border-2 border-accent-purple/30 border-t-accent-purple rounded-full animate-spin mx-auto mb-4" />
                <div className="text-sm font-bold text-accent-purple">Generating Supply Chain</div>
                <div className="text-[10px] text-text-muted mt-1">GPT-4o is mapping relationships…</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel (always visible) ─────────────────────────────── */}
        <div className="flex-shrink-0 border-l border-border-primary flex flex-col overflow-y-auto"
          style={{ background: 'rgba(8,12,24,0.98)', width: '296px' }}>

            {/* ── Overview (no selection, no scenario) ── */}
            {!selectedNode && !impactMap && (() => {
              const critCount = filteredNodes.filter(n => n.risk === 'critical').length;
              const highCount = filteredNodes.filter(n => n.risk === 'high').length;
              const monoCount = filteredNodes.filter(n => n.monopoly).length;
              const maxCritScore = riskModeNodes.length > 0 ? critScore(riskModeNodes[0], allEdges) : 1;
              return (
                <>
                  {/* System stats header */}
                  <div className="p-4 border-b border-border-primary flex-shrink-0">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[9px] font-black text-text-primary uppercase tracking-widest">Supply Chain Intel</span>
                      <button
                        onClick={() => { setGraphMode(m => m === 'risk' ? 'network' : 'risk'); }}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold border transition-all ${graphMode === 'risk' ? 'bg-accent-red/15 border-accent-red/40 text-accent-red' : 'border-border-primary text-text-muted hover:text-accent-red/70 hover:border-accent-red/30'}`}
                      >
                        <Eye className="w-3 h-3" /> {graphMode === 'risk' ? 'Network' : 'Risk View'}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: 'Critical Nodes',           value: critCount, accent: critCount > 0 ? '#ff1744' : '#4ade80' },
                        { label: 'High Risk Nodes',          value: highCount, accent: highCount > 2 ? '#ff9800' : '#64748b' },
                        { label: 'Single Points of Failure', value: monoCount, accent: monoCount > 0 ? '#ff5722' : '#4ade80' },
                        { label: 'Visible Connections',      value: filteredEdges.length, accent: '#00d4ff' },
                      ].map(s => (
                        <div key={s.label} className="flex items-center justify-between">
                          <span className="text-[9px] text-text-muted">{s.label}</span>
                          <span className="text-[13px] font-black font-mono" style={{ color: s.accent }}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top nodes by criticality */}
                  <div className="flex-1 overflow-y-auto">
                    <div className="px-4 py-2 text-[8px] font-bold text-text-muted uppercase tracking-widest border-b border-border-primary/40 sticky top-0 backdrop-blur-sm flex items-center justify-between"
                      style={{ background: 'rgba(8,12,24,0.96)' }}>
                      <span>Critical Node Ranking</span>
                      <span className="text-[8px] font-normal">click to explore</span>
                    </div>
                    {riskModeNodes.map((node, i) => {
                      const score = critScore(node, allEdges);
                      return (
                        <button
                          key={node.id}
                          onClick={() => setSelectedNodeId(node.id)}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 border-b border-border-primary/30 hover:bg-bg-tertiary/20 transition-all text-left"
                        >
                          <div className="text-[9px] font-black text-text-muted w-4 flex-shrink-0 text-center">#{i + 1}</div>
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: node.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="font-mono font-black text-[11px]" style={{ color: node.color }}>{node.id}</span>
                              <RiskBadge level={node.risk} size="xs" />
                              {node.monopoly && (
                                <span className="text-[7px] font-black px-1 rounded" style={{ background: '#ff174415', color: '#ff1744' }}>MON</span>
                              )}
                            </div>
                            <div className="text-[9px] text-text-muted truncate mb-1">{node.label}</div>
                            <CriticalityBar value={score} max={maxCritScore} height={2} />
                          </div>
                        </button>
                      );
                    })}
                    {riskModeNodes.length === 0 && (
                      <div className="p-6 text-center text-[10px] text-text-muted">No nodes visible — adjust filters above</div>
                    )}
                  </div>
                </>
              );
            })()}

            {/* ── Scenario results ── */}
            {impactMap && !selectedNode && (
              <>
                <div className="p-4 border-b border-border-primary flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-[9px] font-bold text-accent-yellow uppercase tracking-widest">Scenario Results</div>
                      <div className="text-xs text-text-primary font-bold mt-0.5">{SCENARIO_META[scenarioType].label}</div>
                    </div>
                    <button onClick={clearScenario} className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="text-[10px] text-text-muted">Origin: <span className="text-text-primary font-mono font-bold">{scenarioOrigin}</span> · {scenarioHops} hop{scenarioHops > 1 ? 's' : ''} · {rankedImpact.length} affected</div>
                </div>
                <div className="p-3 flex-1">
                  <div className="flex gap-3 mb-3">
                    <div className="flex-1">
                      <div className="text-[8px] font-bold text-accent-red uppercase tracking-widest mb-1.5">Most at Risk</div>
                      {rankedImpact.filter(i => i.score < -0.2).slice(0, 5).map(i => {
                        const n = enrichedAllNodes.find(x => x.id === i.nodeId);
                        return (
                          <button key={i.nodeId} onClick={() => setSelectedNodeId(i.nodeId)}
                            className="flex items-center gap-1.5 mb-1.5 w-full hover:bg-bg-tertiary/30 rounded px-1 py-0.5 transition-all">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: scoreColor(i.score) }} />
                            <span className="font-mono font-bold text-[10px]" style={{ color: n?.color || '#8892a4' }}>{i.nodeId}</span>
                            <span className="ml-auto text-[9px] font-mono font-bold" style={{ color: scoreColor(i.score) }}>{(i.score * 100).toFixed(0)}%</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex-1">
                      <div className="text-[8px] font-bold text-accent-green uppercase tracking-widest mb-1.5">Beneficiaries</div>
                      {rankedImpact.filter(i => i.score > 0.15).slice(0, 5).map(i => {
                        const n = enrichedAllNodes.find(x => x.id === i.nodeId);
                        return (
                          <button key={i.nodeId} onClick={() => setSelectedNodeId(i.nodeId)}
                            className="flex items-center gap-1.5 mb-1.5 w-full hover:bg-bg-tertiary/30 rounded px-1 py-0.5 transition-all">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: scoreColor(i.score) }} />
                            <span className="font-mono font-bold text-[10px]" style={{ color: n?.color || '#8892a4' }}>{i.nodeId}</span>
                            <span className="ml-auto text-[9px] font-mono font-bold" style={{ color: scoreColor(i.score) }}>+{(i.score * 100).toFixed(0)}%</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── Supply chain detail ── */}
            {selectedNode && (
              <>
                <div className="p-4 border-b border-border-primary flex-shrink-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: selectedNode.color, boxShadow: `0 0 10px ${selectedNode.color}` }} />
                      <div>
                        <div className="font-black font-mono text-xl leading-none" style={{ color: selectedNode.color }}>{selectedNode.id}</div>
                        <div className="text-xs text-text-secondary mt-0.5">{selectedNode.label}</div>
                      </div>
                    </div>
                    <button onClick={() => setSelectedNodeId(null)} className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </div>

                  {/* Risk + meta badges */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <RiskBadge level={selectedNode.risk} size="sm" />
                    {selectedNode.monopoly && (
                      <span className="text-[8px] px-1.5 py-px rounded font-black uppercase tracking-wider flex items-center gap-1"
                        style={{ background: '#ff174418', color: '#ff1744', border: '1px solid #ff174440' }}>
                        <AlertTriangle className="w-2.5 h-2.5" /> Monopoly
                      </span>
                    )}
                    {/* Confidence badge */}
                    {selectedNode.portfolio === 'dynamic' ? (
                      <span className="text-[7px] px-1.5 py-px rounded font-black uppercase tracking-wider"
                        style={{ background: '#e879f918', color: '#e879f9', border: '1px solid #e879f940' }}>
                        AI CHAIN
                      </span>
                    ) : (
                      <span className="text-[7px] px-1.5 py-px rounded font-black uppercase tracking-wider"
                        style={{ background: '#4ade8015', color: '#4ade80', border: '1px solid #4ade8035' }}>
                        VERIFIED
                      </span>
                    )}
                    <span className="ml-auto text-[9px] text-text-muted capitalize">{selectedNode.role?.replace('_', ' ')} · {selectedNode.region}</span>
                  </div>

                  {/* CORE RISK — single sharp sentence */}
                  <div className="rounded-lg px-3 py-2.5 mb-0"
                    style={{ background: `${selectedNode.color}0c`, borderLeft: `3px solid ${selectedNode.color}60` }}>
                    <div className="text-[8px] font-bold text-text-muted uppercase tracking-widest mb-1">Core Risk</div>
                    <div className="text-[11px] text-text-primary font-medium leading-snug">
                      {whyItMatters(selectedNode, allEdges)}
                    </div>
                  </div>
                </div>

                {/* ── FINANCIAL EXPOSURE (Priority 1) ── */}
                {selectedNode.financialExposure && (
                  <FinancialExposurePanel data={selectedNode.financialExposure} nodeColor={selectedNode.color} />
                )}

                {/* ── TIME TO IMPACT (Priority 2) ── */}
                {selectedNode.timeToImpact && (
                  <TimeToImpactTimeline data={selectedNode.timeToImpact} />
                )}

                {/* ── DISRUPTION PROBABILITY (Priority 3) ── */}
                {selectedNode.disruption && (
                  <DisruptionProbabilityPanel data={selectedNode.disruption} />
                )}

                {/* ── POSITION ANGLE ── */}
                {(() => {
                  const { pricingPower, moat, powerColor } = computeStrategicAngle(selectedNode, allEdges);
                  const longSignal = pricingPower === 'DOMINANT' || pricingPower === 'HIGH'
                    ? `${selectedNode.id} holds structural pricing power — ${moat.toLowerCase()}`
                    : pricingPower === 'MEDIUM'
                    ? `Moderate moat on ${selectedNode.sector.toLowerCase()} supply — ${moat.toLowerCase()}`
                    : `Position on recovery or diversification of ${selectedNode.sector.toLowerCase()} supply`;
                  const shortTrigger = selectedNode.monopoly
                    ? `Geopolitical event in ${selectedNode.region} or regulator action forces supply diversification`
                    : selectedNode.risk === 'critical'
                    ? `Any capacity shock in ${selectedNode.region} removes this node with no near-term substitute`
                    : `Concentration drops below 40% as buyer diversifies — pricing power erodes`;
                  return (
                    <div className="px-4 py-3 border-b border-border-primary flex-shrink-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[8px] font-bold text-text-muted uppercase tracking-widest">Position Angle</div>
                        <span className="text-[7px] font-black uppercase px-1.5 py-px rounded" style={{ background: `${powerColor}18`, color: powerColor, border: `1px solid ${powerColor}35` }}>{pricingPower}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="rounded px-2 py-1.5" style={{ background: '#4ade8010', border: '1px solid #4ade8025' }}>
                          <div className="text-[7px] font-black uppercase tracking-widest mb-0.5" style={{ color: '#4ade80' }}>⬆ LONG SIGNAL</div>
                          <div className="text-[9px] text-text-secondary leading-snug">{longSignal}</div>
                        </div>
                        <div className="rounded px-2 py-1.5" style={{ background: '#ff174410', border: '1px solid #ff174425' }}>
                          <div className="text-[7px] font-black uppercase tracking-widest mb-0.5" style={{ color: '#ff5722' }}>⬇ SHORT TRIGGER</div>
                          <div className="text-[9px] text-text-secondary leading-snug">{shortTrigger}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── EXPOSURE (bars) ── */}
                <div className="px-4 py-3 border-b border-border-primary flex-shrink-0">
                  <div className="text-[8px] font-bold text-text-muted uppercase tracking-widest mb-2">Exposure</div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[8px] mb-0.5">
                        <span className="text-text-muted">Chain Weight</span>
                        <span className="font-mono font-bold text-accent-cyan">{selectedNode.importance}/10</span>
                      </div>
                      <CriticalityBar value={selectedNode.importance} max={10} height={3} />
                    </div>
                    {(() => {
                      const maxConc = allIncoming.length > 0 ? Math.max(...allIncoming.map(e => e.concentration)) : 0;
                      const nonSub  = allIncoming.filter(e => !e.substitutable).length;
                      return (<>
                        {maxConc > 0 && (
                          <div>
                            <div className="flex justify-between text-[8px] mb-0.5">
                              <span className="text-text-muted">Peak Concentration</span>
                              <span className="font-mono font-bold" style={{ color: maxConc > 0.7 ? '#ff1744' : '#ff9800' }}>{Math.round(maxConc * 100)}%</span>
                            </div>
                            <CriticalityBar value={maxConc * 10} max={10} height={3} />
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[8px]">
                          <span className="text-text-muted">Substitutability</span>
                          <span className={`font-bold ${nonSub > 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                            {nonSub > 0 ? `${nonSub} locked-in path${nonSub > 1 ? 's' : ''}` : 'DIVERSIFIED'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[8px]">
                          <span className="text-text-muted">Geo Exposure</span>
                          <span className="font-bold text-text-primary">{selectedNode.region} · {selectedNode.risk}</span>
                        </div>
                      </>);
                    })()}
                  </div>
                </div>

                {/* IF THIS FAILS — inline BFS result */}
                {selectedNodeImpact && (() => {
                  const hop1 = [...selectedNodeImpact.values()].filter(i => i.direction !== 'origin' && Math.abs(i.score) > 0.25).slice(0, 3);
                  const hop2 = [...selectedNodeImpact.values()].filter(i => i.direction !== 'origin' && Math.abs(i.score) <= 0.25 && Math.abs(i.score) > 0.08).slice(0, 3);
                  if (!hop1.length && !hop2.length) return null;
                  return (
                    <div className="px-4 py-3 border-b border-border-primary flex-shrink-0">
                      <div className="text-[8px] font-bold text-text-muted uppercase tracking-widest mb-2">Failure Impact</div>
                      {hop1.length > 0 && (
                        <div className="mb-2">
                          <div className="text-[7px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#ff5722' }}>Direct (hop 1)</div>
                          <div className="flex flex-wrap gap-1">
                            {hop1.map(i => (
                              <button key={i.nodeId} onClick={() => setSelectedNodeId(i.nodeId)}
                                className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded transition-all hover:scale-105"
                                style={{ background: '#ff174420', color: '#ff5722', border: '1px solid #ff174440' }}>
                                {i.nodeId} {i.score > 0 ? '+' : ''}{(i.score * 100).toFixed(0)}%
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {hop2.length > 0 && (
                        <div className="mb-2">
                          <div className="text-[7px] font-bold uppercase tracking-wider mb-1.5 text-text-muted">Second-Order (hop 2)</div>
                          <div className="flex flex-wrap gap-1">
                            {hop2.map(i => (
                              <button key={i.nodeId} onClick={() => setSelectedNodeId(i.nodeId)}
                                className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded transition-all hover:scale-105"
                                style={{ background: '#64748b18', color: '#94a3b8', border: '1px solid #64748b30' }}>
                                {i.nodeId} {i.score > 0 ? '+' : ''}{(i.score * 100).toFixed(0)}%
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => { setScenarioOrigin(selectedNode.id); setScenarioActive(true); setTimeout(runScenario, 100); }}
                        className="w-full mt-1 py-1.5 text-[9px] font-bold rounded-lg border border-accent-yellow/30 text-accent-yellow hover:bg-accent-yellow/10 transition-colors">
                        Simulate Shock →
                      </button>
                    </div>
                  );
                })()}

                {/* ACTION SIGNAL — single high-conviction sentence */}
                {(() => {
                  const takeaway = whyItMatters(selectedNode, allEdges);
                  const { pricingPower, powerColor } = computeStrategicAngle(selectedNode, allEdges);
                  const sentence = selectedNode.monopoly
                    ? `${selectedNode.id} is a single point of failure — any portfolio with downstream exposure needs this hedged.`
                    : pricingPower === 'DOMINANT' || pricingPower === 'HIGH'
                    ? `${selectedNode.id} has structural pricing power — concentration is a feature, not a bug, until it isn't.`
                    : selectedNode.risk === 'critical'
                    ? `${selectedNode.id} represents unhedgeable risk in current portfolio construction.`
                    : `${selectedNode.id} warrants monitoring — ${selectedNode.risk} risk with ${allIncoming.length + allOutgoing.length} active dependencies.`;
                  return (
                    <div className="px-4 py-3 border-b border-border-primary flex-shrink-0"
                      style={{ background: `${selectedNode.color}06` }}>
                      <div className="text-[8px] font-bold uppercase tracking-widest mb-1.5" style={{ color: selectedNode.color }}>Action Signal</div>
                      <div className="text-[10px] text-text-primary font-semibold leading-snug italic">&ldquo;{sentence}&rdquo;</div>
                    </div>
                  );
                })()}

                {/* Scenario quick-run */}
                {scenarioActive && (
                  <div className="px-4 py-2 border-b border-border-primary flex-shrink-0">
                    <button onClick={() => { setScenarioOrigin(selectedNode.id); setTimeout(runScenario, 50); }}
                      className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-bold rounded-lg transition-all"
                      style={{ background: SCENARIO_META[scenarioType].color + '20', border: `1px solid ${SCENARIO_META[scenarioType].color}40`, color: SCENARIO_META[scenarioType].color }}>
                      <Zap className="w-3 h-3" /> Run {SCENARIO_META[scenarioType].label} here
                    </button>
                  </div>
                )}

                {/* Scenario impact score */}
                {impactMap?.has(selectedNode.id) && (() => {
                  const imp = impactMap.get(selectedNode.id)!;
                  const c   = scoreColor(imp.score);
                  return (
                    <div className="px-4 py-3 border-b border-border-primary flex-shrink-0">
                      <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1.5">Scenario Impact</div>
                      <div className="rounded-lg p-2.5" style={{ background: `${c}12`, border: `1px solid ${c}30` }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm" style={{ color: c }}>{imp.score > 0 ? '+' : ''}{(imp.score * 100).toFixed(0)}%</span>
                          <span className="text-[8px] font-bold uppercase" style={{ color: c }}>{scoreLabel(imp.score)}</span>
                        </div>
                        <div className="text-[9px] text-text-muted leading-relaxed">{imp.reason}</div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── INPUTS ranked cards ── */}
                {allIncoming.length > 0 && (() => {
                  const sorted = [...allIncoming].sort((a, b) => b.concentration - a.concentration);
                  const top3   = sorted.slice(0, 3);
                  const rest   = sorted.slice(3);
                  const getTag = (e: GraphEdge) => {
                    if (!e.substitutable)              return { label: 'SOLE SOURCE', color: '#ff1744' };
                    if (e.concentration > 0.7)          return { label: 'CRITICAL',   color: '#ff5722' };
                    if (e.concentration > 0.4)          return { label: 'ELEVATED',   color: '#ff9800' };
                    if (e.substitutable && e.concentration < 0.3) return { label: 'DIVERSIFIED', color: '#4ade80' };
                    return null;
                  };
                  return (
                    <div className="border-b border-border-primary">
                      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border-primary/30">
                        <ArrowDownLeft className="w-3 h-3 text-accent-cyan" />
                        <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Suppliers</span>
                        <span className="ml-auto text-[9px] font-mono text-text-muted">{allIncoming.length}</span>
                      </div>
                      {top3.map((e, i) => {
                        const src    = allNodes.find(n => n.id === e.source);
                        const inView = visibleIds.has(e.source as string);
                        const tag    = getTag(e);
                        return (
                          <button key={i}
                            className={`w-full flex items-center gap-2 px-4 py-2.5 border-b border-border-primary/20 transition-all text-left ${inView ? 'hover:bg-bg-tertiary/20' : 'opacity-50'}`}
                            onClick={() => inView ? setSelectedNodeId(e.source as string) : undefined}>
                            <span className="text-[8px] font-black text-text-muted w-4 flex-shrink-0">#{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="font-mono font-bold text-[11px]" style={{ color: src?.color || '#8892a4' }}>{e.source as string}</span>
                                {tag && <span className="text-[7px] font-black uppercase px-1 py-px rounded" style={{ background: `${tag.color}18`, color: tag.color, border: `1px solid ${tag.color}35` }}>{tag.label}</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${e.concentration * 100}%`, background: e.concentration > 0.7 ? '#ff1744' : e.concentration > 0.4 ? '#ff9800' : '#4ade80' }} />
                                </div>
                                <span className="text-[8px] font-mono font-bold flex-shrink-0" style={{ color: e.concentration > 0.7 ? '#ff5722' : '#64748b' }}>{Math.round(e.concentration * 100)}%</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                      {rest.length > 0 && (
                        <div className="px-4 py-2 flex items-center gap-2">
                          <span className="text-[8px] text-text-muted">+{rest.length} more:</span>
                          <div className="flex flex-wrap gap-1">
                            {rest.map(e => {
                              const src = allNodes.find(n => n.id === e.source);
                              return (
                                <button key={e.source as string} onClick={() => setSelectedNodeId(e.source as string)}
                                  className="font-mono text-[9px] font-bold px-1 py-px rounded hover:opacity-80"
                                  style={{ color: src?.color || '#64748b' }}>
                                  {e.source as string}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── OUTPUTS ranked cards ── */}
                {allOutgoing.length > 0 && (() => {
                  const sorted = [...allOutgoing].sort((a, b) => (b as GraphEdge & { concentration: number }).concentration - (a as GraphEdge & { concentration: number }).concentration);
                  const top3   = sorted.slice(0, 3);
                  const rest   = sorted.slice(3);
                  return (
                    <div className="border-b border-border-primary">
                      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border-primary/30">
                        <ArrowUpRight className="w-3 h-3 text-accent-green" />
                        <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Customers</span>
                        <span className="ml-auto text-[9px] font-mono text-text-muted">{allOutgoing.length}</span>
                      </div>
                      {top3.map((e, i) => {
                        const tgt    = allNodes.find(n => n.id === e.target);
                        const inView = visibleIds.has(e.target as string);
                        const conc   = (e as GraphEdge & { concentration: number }).concentration;
                        return (
                          <button key={i}
                            className={`w-full flex items-center gap-2 px-4 py-2.5 border-b border-border-primary/20 transition-all text-left ${inView ? 'hover:bg-bg-tertiary/20' : 'opacity-50'}`}
                            onClick={() => inView ? setSelectedNodeId(e.target as string) : undefined}>
                            <span className="text-[8px] font-black text-text-muted w-4 flex-shrink-0">#{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="font-mono font-bold text-[11px]" style={{ color: tgt?.color || '#8892a4' }}>{e.target as string}</span>
                                <span className="text-[8px] px-1 rounded ml-auto" style={{ background: `${EDGE_STYLE[e.type]?.color}20`, color: EDGE_STYLE[e.type]?.color }}>{e.type}</span>
                              </div>
                              <div className="text-[9px] text-text-muted truncate">{e.label}</div>
                            </div>
                          </button>
                        );
                      })}
                      {rest.length > 0 && (
                        <div className="px-4 py-2 flex items-center gap-2">
                          <span className="text-[8px] text-text-muted">+{rest.length} more:</span>
                          <div className="flex flex-wrap gap-1">
                            {rest.map(e => {
                              const tgt = allNodes.find(n => n.id === e.target);
                              return (
                                <button key={e.target as string} onClick={() => setSelectedNodeId(e.target as string)}
                                  className="font-mono text-[9px] font-bold px-1 py-px rounded hover:opacity-80"
                                  style={{ color: tgt?.color || '#64748b' }}>
                                  {e.target as string}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── CAPACITY STATUS ── */}
                {selectedNode.capacity && (
                  <CapacityStatusPanel data={selectedNode.capacity} />
                )}

                {/* ── MARKET ANGLE ── */}
                {selectedNode.marketAngle && (
                  <MarketAnglePanel data={selectedNode.marketAngle} />
                )}

                {/* ── ALTERNATIVES (rich version from nodeIntelligence) ── */}
                {selectedNode.alternatives && selectedNode.alternatives.length > 0 && (
                  <div className="px-4 py-3 border-b border-border-primary flex-shrink-0">
                    <div className="text-[8px] font-bold text-text-muted uppercase tracking-widest mb-2">Alternatives</div>
                    <div className="space-y-2">
                      {selectedNode.alternatives.map((alt, i) => {
                        const feasColor =
                          alt.feasibility === 'immediate'   ? '#4ade80' :
                          alt.feasibility === 'short-term'  ? '#4ade80' :
                          alt.feasibility === 'partial'     ? '#ff9800' :
                          alt.feasibility === 'long-term'   ? '#ffeb3b' : '#ff1744';
                        const hasRichData = 'switchMonths' in alt;
                        return (
                          <div key={i} className="rounded px-2.5 py-2" style={{ background: `${feasColor}08`, border: `1px solid ${feasColor}25` }}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <button onClick={() => setSelectedNodeId(alt.id)}
                                className="font-mono font-bold text-[10px] hover:opacity-80 transition-opacity"
                                style={{ color: feasColor }}>{alt.id}</button>
                              <span className="text-[8px] text-text-secondary truncate flex-1">{alt.label}</span>
                              <span className="text-[7px] font-black uppercase px-1 py-px rounded flex-shrink-0"
                                style={{ background: `${feasColor}18`, color: feasColor, border: `1px solid ${feasColor}35` }}>
                                {alt.feasibility}
                              </span>
                            </div>
                            {hasRichData && (
                              <div className="flex items-center gap-3 text-[7px] text-text-muted mb-1">
                                {(alt as unknown as { switchMonths: number }).switchMonths > 0 && <span>{(alt as unknown as { switchMonths: number }).switchMonths}mo switch</span>}
                                {(alt as unknown as { costPremium: number }).costPremium !== 0 && (
                                  <span style={{ color: (alt as unknown as { costPremium: number }).costPremium > 0 ? '#ff9800' : '#4ade80' }}>
                                    {(alt as unknown as { costPremium: number }).costPremium > 0 ? '+' : ''}{Math.round((alt as unknown as { costPremium: number }).costPremium * 100)}% cost
                                  </span>
                                )}
                                {(alt as unknown as { qualRequired: boolean }).qualRequired && <span className="text-accent-yellow">qual req</span>}
                              </div>
                            )}
                            {'notes' in alt && (
                              <div className="text-[7px] text-text-muted leading-snug italic">{(alt as { notes: string }).notes}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ACTIONS */}
                {(() => {
                  const actions = deriveActions(selectedNode, allEdges);
                  const actionColors: Record<string, string> = { ALERT: '#ff1744', HEDGE: '#ff5722', MONITOR: '#ff9800', WATCH: '#ffeb3b' };
                  return (
                    <div className="px-4 py-3 border-b border-border-primary flex-shrink-0">
                      <div className="text-[8px] font-bold text-text-muted uppercase tracking-widest mb-2">Actions</div>
                      <div className="space-y-2">
                        {actions.map((action, i) => {
                          const c = actionColors[action.type] ?? '#94a3b8';
                          return (
                            <div key={i} className="flex items-start gap-2">
                              <span className="text-[7px] font-black uppercase px-1.5 py-px rounded flex-shrink-0 mt-0.5"
                                style={{ background: `${c}18`, color: c, border: `1px solid ${c}35` }}>
                                {action.type}
                              </span>
                              <span className="text-[9px] text-text-secondary leading-snug">{action.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* ── WATCHLIST (replaces News) ── */}
                <WatchlistPanel
                  triggers={selectedNode.triggers ?? []}
                  news={nodeNews}
                  newsLoading={nodeNewsLoading}
                />

                <div className="p-4 flex-shrink-0 space-y-2">
                  <button
                    onClick={() => setShowDeepAnalysis(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-[11px] font-bold rounded-lg transition-colors border border-accent-purple/40 hover:border-accent-purple/70"
                    style={{ background: '#a78bfa15', color: '#a78bfa' }}
                  >
                    <Zap className="w-3.5 h-3.5" /> Full Intelligence
                  </button>
                  <button onClick={() => navigate(`/stock/${selectedNode.id}`)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-[11px] font-bold text-bg-primary bg-accent-cyan rounded-lg hover:bg-accent-cyan/90 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" /> Stock View
                  </button>
                </div>
              </>
            )}
          </div>
      </div>

      {/* ── Deep Analysis Modal ──────────────────────────────────────── */}
      {showDeepAnalysis && selectedNode && (
        <DeepAnalysisPanel
          symbol={selectedNode.id}
          companyName={selectedNode.label}
          onClose={() => setShowDeepAnalysis(false)}
          onTickerClick={id => {
            setShowDeepAnalysis(false);
            setSelectedNodeId(id);
          }}
        />
      )}
    </div>
  );
}
