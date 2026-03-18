// ============================================================
// Supply Chain Adapter
// Converts SupplyChainNode/Edge → GraphNode/GraphEdge
// Skips nodes that already exist in the main graph (uppercase IDs)
// Remaps overlapping IDs on edges so they connect to existing nodes
// ============================================================
import type { GraphNode, GraphEdge } from './connections';
import { NODES as SC_NODES, EDGES as SC_EDGES } from './supplyChainData';

// ── ID remap: sc lowercase id → existing uppercase graph id ───────────────
const ID_REMAP: Record<string, string> = {
  nvda:            'NVDA',
  tsm:             'TSM',
  asml:            'ASML',
  amat:            'AMAT',
  lrcx:            'LRCX',
  klac:            'KLAC',
  mu:              'MU',
  sk_hynix:        'HXSCL',
  samsung_foundry: 'SSNLF',
  samsung_mem:     'SSNLF',
  ter:             'TER',
  vrt:             'VRT',
  amkr:            'AMKR',
  mp_materials:    'MP',
  cohr:            'COHR',
  lite:            'LITE',
  advantest:       'ATEYY',
  freeport:        'FCX',
  smci:            'SMCI',
  dell:            'DELL',
  lynas:           'LYSDY',
};

function resolveId(id: string): string {
  return ID_REMAP[id] ?? id;
}

// ── Risk mapping ──────────────────────────────────────────────────────────
function mapRisk(r: string): GraphNode['risk'] {
  if (r === 'crit')   return 'critical';
  if (r === 'hi')     return 'high';
  if (r === 'med')    return 'medium';
  return 'low';
}

// ── NodeRole from layer ───────────────────────────────────────────────────
function mapRole(layer: string): GraphNode['role'] {
  if (layer === 'L-2' || layer === 'L-1') return 'upstream';
  if (layer === 'L5')                     return 'infrastructure';
  if (layer === 'L6')                     return 'downstream';
  return 'midstream'; // L0, L1, L2, L3, L4
}

// ── Region from ISO country code ──────────────────────────────────────────
function mapRegion(cc: string): GraphNode['region'] {
  if (cc === 'US') return 'US';
  if (cc === 'TW') return 'TW';
  if (cc === 'KR') return 'KR';
  if (cc === 'NL') return 'NL';
  if (cc === 'JP') return 'JP';
  if (cc === 'AU') return 'AU';
  if (cc === 'CA') return 'CA';
  if (cc === 'CN' || cc === 'HK') return 'CN';
  // DE, FR, BE, AT, CH, DK → EU
  return 'EU';
}

// ── Sector + color from layer_label ──────────────────────────────────────
const LAYER_SECTOR_MAP: [string[], string, string][] = [
  [['Wafer/RE','Wafer','PolySi','RE Mining','Mining','Cu Mining','Refining'], 'Materials',       '#f59e0b'],
  [['Fotoresist','MOR/ALD','CMP/Chemicals','CMP Pad','CMP','CMP/Gas/Pkg','Chemicals'],           'Chemicals',       '#fbbf24'],
  [['Gas','Gas WF6','HF','Etchants'],                                                             'Process Gases',   '#67e8f9'],
  [['EUV Monopoly','Equipment','Etching','Metrologia','ALD','Coater 88%'],                        'Semiconductors',  '#00d4ff'],
  [['Test ATE'],                                                                                   'Test & Yield',    '#34d399'],
  [['Foundry','Foundry alt.','Foundry mature'],                                                   'Semiconductors',  '#00d4ff'],
  [['OSAT','PFLO','ABF Film','ABF/LMC','ABF/Cu','Film','LMC','Underfill','TIM/Film','Solder Bump','PSPI'], 'Packaging', '#94a3b8'],
  [['HBM Primary','HBM Secondary','HBM Tertiary'],                                                'Memory',          '#60a5fa'],
  [['FC-BGA','Substrati','Substrati EU','PCB','MLCC','MLCC/Magneti','MLCC/Res.'],                 'Substrates',      '#c4b5fd'],
  [['Power/Cooling','Liquid Cooling','VRM','Power','GaN Power'],                                  'Datacenter & Power', '#a78bfa'],
  [['Connettori'],                                                                                 'Industrials',     '#94a3b8'],
  [['Ottica'],                                                                                     'Photonics',       '#f472b6'],
  [['Networking'],                                                                                 'Technology',      '#00d4ff'],
  [['ODM','Server AI','OEM','EMS/Design','EMS'],                                                  'Industrials',     '#94a3b8'],
];

function mapSectorColor(layerLabel: string): [string, string] {
  for (const [labels, sector, color] of LAYER_SECTOR_MAP) {
    if (labels.includes(layerLabel)) return [sector, color];
  }
  return ['Industrials', '#94a3b8'];
}

// ── Edge type heuristic ────────────────────────────────────────────────────
function mapEdgeType(label: string): GraphEdge['type'] {
  const l = label.toLowerCase();
  if (l.includes('wafer') || l.includes('foundry') || l.includes('n3') || l.includes('n5')) return 'foundry';
  if (l.includes('hbm') || l.includes('memory') || l.includes('abf') || l.includes('substrati')) return 'material';
  if (l.includes('equipment') || l.includes('euv') || l.includes('ald') || l.includes('coater')) return 'technology';
  if (l.includes('test') || l.includes('ate')) return 'testing';
  return 'supplier';
}

function mapEdgeRisk(scType: string): GraphEdge['risk'] {
  if (scType === 'critical') return 'critical';
  if (scType === 'high')     return 'high';
  if (scType === 'med')      return 'medium';
  return 'low';
}

// ── New sector colors to be merged into SECTOR_COLORS ─────────────────────
export const SC_NEW_SECTOR_COLORS: Record<string, string> = {
  'Chemicals':    '#fbbf24',
  'Process Gases':'#67e8f9',
  'Substrates':   '#c4b5fd',
};

// ── Nodes to add (skip existing, skip NVIDIA target node) ─────────────────
const EXISTING_SC_IDS = new Set(Object.keys(ID_REMAP));

export const SC_NEW_NODES: GraphNode[] = SC_NODES
  .filter(n => !EXISTING_SC_IDS.has(n.id) && n.risk !== 'target')
  .map(n => {
    const [sector, color] = mapSectorColor(n.layer_label);
    return {
      id:         n.id,
      label:      n.name,
      sector,
      portfolio:  'nvidia-sc',
      color,
      importance: Math.max(1, Math.min(10, Math.round(n.bottleneck_score ?? 3))),
      role:       mapRole(n.layer),
      risk:       mapRisk(n.risk),
      monopoly:   (n.substitutability === 0) ||
                  ((n.bottleneck_score ?? 0) >= 9 && (n.substitutability ?? 10) <= 1),
      region:     mapRegion(n.country_code),
      note:       n.role,
    };
  });

// ── Edges — remap IDs, drop self-loops (samsung_foundry + samsung_mem → same) ─
export const SC_NEW_EDGES: GraphEdge[] = SC_EDGES
  .map(e => ({
    source:       resolveId(e.source),
    target:       resolveId(e.target),
    type:         mapEdgeType(e.label),
    label:        e.label,
    strength:     e.weight,
    concentration: Math.min(1, e.weight / 10),
    substitutable: e.weight < 7,
    risk:         mapEdgeRisk(e.type),
  }))
  .filter(e => e.source !== e.target);
