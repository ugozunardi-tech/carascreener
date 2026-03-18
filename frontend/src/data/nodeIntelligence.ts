export interface FinancialExposure {
  revenueAtRisk: number;        // $B
  ebitdaImpact: number;         // $B per quarter
  valuationSensitivity: number; // $B market cap
  capacityLoss: number;         // 0-1
  scenario: string;
}

export interface TimeToImpact {
  bucket: 'immediate' | 'near' | 'medium' | 'structural';
  days: number;
  inventoryDays: number;
  leadTimeDays: number;
  switchDelayMonths: number;
}

export interface DisruptionProfile {
  dps3m: number;   // 0-1
  dps12m: number;  // 0-1
  confidence: 'high' | 'medium' | 'low';
  drivers: string[];
}

export interface CapacityProfile {
  utilization: number;   // 0-100
  css: number;           // 0-1 capacity stress score
  type: 'cyclical' | 'structural' | 'unknown';
  leadTimeDays: number;
  capexTrend: 'expanding' | 'stable' | 'contracting';
}

export interface MarketAngle {
  mms: 'underpriced' | 'priced' | 'overpriced';
  bullTrigger: string;
  bearTrigger: string;
  consensusGap: string;
}

export interface IntelTrigger {
  category: 'hard-data' | 'policy' | 'news' | 'market';
  priority: 'immediate' | 'watch' | 'monitor';
  headline: string;
  timestamp: number;  // unix seconds
}

export interface RichAlternative {
  id: string;
  label: string;
  feasibility: 'immediate' | 'short-term' | 'long-term' | 'partial' | 'blocked';
  switchMonths: number;
  costPremium: number;   // 0.10 = 10% cost increase
  perfDelta: number;     // -0.15 = 15% performance degradation
  qualRequired: boolean;
  notes: string;
}

export interface NodeIntelligence {
  financialExposure?: FinancialExposure;
  timeToImpact?: TimeToImpact;
  disruption?: DisruptionProfile;
  capacity?: CapacityProfile;
  marketAngle?: MarketAngle;
  triggers?: IntelTrigger[];
  alternatives?: RichAlternative[];
}

export const NODE_INTELLIGENCE: Record<string, NodeIntelligence> = {
  TSM: {
    financialExposure: {
      revenueAtRisk: 55.2,
      ebitdaImpact: 4.7,
      valuationSensitivity: 141.0,
      capacityLoss: 0.60,
      scenario: 'Full CoWoS halt — NVDA H100/H200/B200 production stops',
    },
    timeToImpact: {
      bucket: 'near',
      days: 60,
      inventoryDays: 45,
      leadTimeDays: 165,
      switchDelayMonths: 30,
    },
    disruption: {
      dps3m: 0.22,
      dps12m: 0.61,
      confidence: 'medium',
      drivers: [
        'Taiwan Strait geopolitical exposure (high)',
        'CoWoS fab utilization ~94% (est.)',
        'Active US export control escalation',
        'No alternative N3/N4 foundry at volume',
      ],
    },
    capacity: {
      utilization: 94,
      css: 0.82,
      type: 'structural',
      leadTimeDays: 165,
      capexTrend: 'expanding',
    },
    marketAngle: {
      mms: 'underpriced',
      bullTrigger: 'TSMC announces ahead-of-schedule CoWoS expansion; N2 yield exceeds 60% at volume',
      bearTrigger: 'Taiwan Strait military exercise causes TSMC to pause customer onboarding or halt fab operations',
      consensusGap: 'Sell-side models assume no disruption. CoWoS utilization staying >92% through Q3 implies 8–12% NTM EPS cut not in consensus.',
    },
    triggers: [
      {
        category: 'hard-data',
        priority: 'immediate',
        headline: 'CoWoS lead time extended to 180 days (was 150)',
        timestamp: 1741996800,
      },
      {
        category: 'policy',
        priority: 'watch',
        headline: 'US Commerce Dept reviewing TSMC advanced node export rules',
        timestamp: 1741564800,
      },
      {
        category: 'news',
        priority: 'monitor',
        headline: 'TSMC Q1 2026 earnings: CoWoS capacity guidance expected',
        timestamp: 1741132800,
      },
      {
        category: 'market',
        priority: 'monitor',
        headline: 'ASML Q1 order book implies TSMC EUV utilization signal',
        timestamp: 1740614400,
      },
    ],
    alternatives: [
      {
        id: 'SSNLF',
        label: 'Samsung SF3E',
        feasibility: 'blocked',
        switchMonths: 24,
        costPremium: 0.30,
        perfDelta: -0.15,
        qualRequired: true,
        notes: 'Yield parity not demonstrated at CoWoS/HBM volume',
      },
      {
        id: 'INTC',
        label: 'Intel 18A',
        feasibility: 'long-term',
        switchMonths: 36,
        costPremium: 0.15,
        perfDelta: -0.10,
        qualRequired: true,
        notes: 'Volume yield unproven; advanced packaging ecosystem TBD',
      },
      {
        id: 'TSEM',
        label: 'TSMC mature nodes',
        feasibility: 'partial',
        switchMonths: 0,
        costPremium: 0.0,
        perfDelta: -0.30,
        qualRequired: false,
        notes: 'Works for Ampere-generation only; incompatible with Blackwell architecture',
      },
    ],
  },

  ASML: {
    financialExposure: {
      revenueAtRisk: 44.0,
      ebitdaImpact: 3.8,
      valuationSensitivity: 114.0,
      capacityLoss: 0.90,
      scenario: 'EUV tool export ban — no advanced node production possible globally',
    },
    timeToImpact: {
      bucket: 'structural',
      days: 365,
      inventoryDays: 0,
      leadTimeDays: 365,
      switchDelayMonths: 36,
    },
    disruption: {
      dps3m: 0.08,
      dps12m: 0.38,
      confidence: 'medium',
      drivers: [
        'Netherlands export license risk (active review)',
        'Sole EUV manufacturer globally',
        'US-China tech export war escalation',
        'Single Eindhoven manufacturing site',
      ],
    },
    capacity: {
      utilization: 100,
      css: 0.95,
      type: 'structural',
      leadTimeDays: 365,
      capexTrend: 'expanding',
    },
    marketAngle: {
      mms: 'priced',
      bullTrigger: 'ASML High-NA EUV ramp accelerates; booking cycle extends through 2028 with record backlog',
      bearTrigger: 'Netherlands expands export restrictions to include DUV; Chinese customers lose access to installed base',
      consensusGap: 'Market broadly understands ASML monopoly. Tail risk is export restriction severity extending beyond current scope.',
    },
    triggers: [
      {
        category: 'policy',
        priority: 'immediate',
        headline: 'Netherlands reviewing ASML DUV maintenance licenses to China',
        timestamp: 1741996800,
      },
      {
        category: 'hard-data',
        priority: 'watch',
        headline: 'ASML backlog €42B — EUV delivery slots sold through 2027',
        timestamp: 1741824000,
      },
      {
        category: 'market',
        priority: 'monitor',
        headline: 'High-NA EUV yield ramp at IMEC — implications for 2nm timeline',
        timestamp: 1741132800,
      },
    ],
    alternatives: [
      {
        id: 'INTC',
        label: 'Intel (DUV process)',
        feasibility: 'blocked',
        switchMonths: 48,
        costPremium: 0.40,
        perfDelta: -0.40,
        qualRequired: true,
        notes: 'DUV multi-patterning cannot replicate EUV at <5nm; fundamental physical barrier',
      },
    ],
  },

  NVDA: {
    financialExposure: {
      revenueAtRisk: 55.2,
      ebitdaImpact: 4.7,
      valuationSensitivity: 141.0,
      capacityLoss: 0.60,
      scenario: 'TSMC CoWoS halt cascades to halt H200/B200 production',
    },
    timeToImpact: {
      bucket: 'near',
      days: 60,
      inventoryDays: 45,
      leadTimeDays: 165,
      switchDelayMonths: 30,
    },
    disruption: {
      dps3m: 0.18,
      dps12m: 0.54,
      confidence: 'medium',
      drivers: [
        'TSMC CoWoS concentration 92%',
        'HBM3e supply from 2 vendors only',
        'US export control on China shipments (30%+ revenue)',
        'Blackwell architecture = TSMC N4P only',
      ],
    },
    capacity: {
      utilization: 0,
      css: 0.10,
      type: 'unknown',
      leadTimeDays: 0,
      capexTrend: 'stable',
    },
    marketAngle: {
      mms: 'underpriced',
      bullTrigger: 'TSMC CoWoS expansion confirmed ahead of schedule; GB200 NVL system shipments accelerate to hyperscalers',
      bearTrigger: 'CoWoS allocation tightens in Q2; NVDA delays GB200 NVL deliveries causing hyperscaler capex revision',
      consensusGap: 'Consensus assumes uninterrupted supply through 2026. Any CoWoS shortfall forces significant EPS cuts across AI infrastructure names.',
    },
    triggers: [
      {
        category: 'hard-data',
        priority: 'immediate',
        headline: 'CoWoS packaging lead time tracking: channel checks suggest 180-day quotes',
        timestamp: 1741996800,
      },
      {
        category: 'policy',
        priority: 'watch',
        headline: 'BIS Rule expanding H20 export controls under review',
        timestamp: 1741824000,
      },
      {
        category: 'news',
        priority: 'monitor',
        headline: 'GB200 NVL system customer acceptance testing schedule',
        timestamp: 1741564800,
      },
      {
        category: 'market',
        priority: 'monitor',
        headline: 'Hyperscaler capex guidance — implied NVDA GPU allocation',
        timestamp: 1740614400,
      },
    ],
  },

  HXSCL: {
    financialExposure: {
      revenueAtRisk: 22.0,
      ebitdaImpact: 2.1,
      valuationSensitivity: 63.0,
      capacityLoss: 0.40,
      scenario: 'SK Hynix HBM3e supply disruption — NVDA GPU production constrained',
    },
    timeToImpact: {
      bucket: 'near',
      days: 75,
      inventoryDays: 60,
      leadTimeDays: 90,
      switchDelayMonths: 12,
    },
    disruption: {
      dps3m: 0.15,
      dps12m: 0.45,
      confidence: 'medium',
      drivers: [
        'Korea geopolitical risk (North Korea escalation)',
        'HBM3e fab utilization ~91%',
        'Limited qualified HBM vendors (SK Hynix + Micron only)',
        'HBM4 transition yield execution risk',
      ],
    },
    capacity: {
      utilization: 91,
      css: 0.78,
      type: 'cyclical',
      leadTimeDays: 90,
      capexTrend: 'expanding',
    },
    marketAngle: {
      mms: 'priced',
      bullTrigger: 'SK Hynix HBM4 qualification at NVDA ahead of schedule; doubles 2026 CoWoS-compatible HBM capacity',
      bearTrigger: 'North Korea escalation disrupts Korean power grid; HBM3e fab shutdown causes NVDA supply crunch',
      consensusGap: 'Market partially prices Korea risk. HBM4 transition yield risk and qualification timeline not fully reflected.',
    },
    triggers: [
      {
        category: 'hard-data',
        priority: 'watch',
        headline: 'SK Hynix HBM3e allocation to NVDA: channel suggests 90-day lead time stable',
        timestamp: 1741824000,
      },
      {
        category: 'policy',
        priority: 'monitor',
        headline: 'US-Korea semiconductor alliance renewal talks — HBM export security',
        timestamp: 1741564800,
      },
      {
        category: 'news',
        priority: 'monitor',
        headline: 'HBM4 yield progress at SK Hynix: TechInsights Q1 report expected',
        timestamp: 1741132800,
      },
    ],
    alternatives: [
      {
        id: 'MU',
        label: 'Micron HBM3e',
        feasibility: 'short-term',
        switchMonths: 6,
        costPremium: 0.05,
        perfDelta: -0.05,
        qualRequired: true,
        notes: 'Already qualified but capacity constrained; ~25% of NVDA HBM supply',
      },
      {
        id: 'SSNLF',
        label: 'Samsung HBM3e',
        feasibility: 'long-term',
        switchMonths: 18,
        costPremium: 0.0,
        perfDelta: -0.10,
        qualRequired: true,
        notes: 'Samsung HBM3e yield issues delayed NVDA qualification; timeline uncertain',
      },
    ],
  },

  MU: {
    financialExposure: {
      revenueAtRisk: 11.0,
      ebitdaImpact: 1.1,
      valuationSensitivity: 33.0,
      capacityLoss: 0.25,
      scenario: 'Micron HBM supply disruption — partial NVDA GPU production impact',
    },
    timeToImpact: {
      bucket: 'near',
      days: 90,
      inventoryDays: 90,
      leadTimeDays: 60,
      switchDelayMonths: 6,
    },
    disruption: {
      dps3m: 0.10,
      dps12m: 0.32,
      confidence: 'medium',
      drivers: [
        'Taiwan Taichung fab exposure',
        'HBM3e ramp execution risk',
        'DRAM cycle volatility',
        'US-China sales restriction impact on China revenue',
      ],
    },
    capacity: {
      utilization: 85,
      css: 0.62,
      type: 'cyclical',
      leadTimeDays: 60,
      capexTrend: 'expanding',
    },
    marketAngle: {
      mms: 'priced',
      bullTrigger: 'Micron HBM3e ramp achieves 35%+ NVDA supply share; confirms US domestic HBM independence',
      bearTrigger: 'DRAM oversupply cycle forces Micron to cut HBM capex; supply share stays at 25%',
      consensusGap: 'Market understands Micron HBM opportunity. Risk is execution on ramp timeline vs SK Hynix.',
    },
    triggers: [
      {
        category: 'hard-data',
        priority: 'watch',
        headline: 'Micron Q2 FY2026 HBM3e shipment volumes vs guidance',
        timestamp: 1741996800,
      },
      {
        category: 'news',
        priority: 'monitor',
        headline: 'Micron Idaho fab construction progress — HBM4 timeline',
        timestamp: 1741564800,
      },
    ],
    alternatives: [
      {
        id: 'HXSCL',
        label: 'SK Hynix HBM3e',
        feasibility: 'short-term',
        switchMonths: 3,
        costPremium: 0.02,
        perfDelta: 0.05,
        qualRequired: false,
        notes: 'Already primary NVDA supplier; rebalancing straightforward',
      },
    ],
  },

  MP: {
    financialExposure: {
      revenueAtRisk: 8.4,
      ebitdaImpact: 0.9,
      valuationSensitivity: 27.0,
      capacityLoss: 0.70,
      scenario: 'US rare earth supply disruption — EV motor and defense magnet shortage',
    },
    timeToImpact: {
      bucket: 'immediate',
      days: 30,
      inventoryDays: 30,
      leadTimeDays: 120,
      switchDelayMonths: 18,
    },
    disruption: {
      dps3m: 0.18,
      dps12m: 0.52,
      confidence: 'low',
      drivers: [
        'China 2024 REE export controls (active)',
        'Single Mountain Pass processing site',
        'Only US rare earth mine + processor',
        'DoD supply chain strategic dependency',
      ],
    },
    capacity: {
      utilization: 88,
      css: 0.72,
      type: 'structural',
      leadTimeDays: 120,
      capexTrend: 'expanding',
    },
    marketAngle: {
      mms: 'underpriced',
      bullTrigger: 'DoD signs 10-year NdFeB magnet procurement contract; MP reaches Stage III magnet production at volume',
      bearTrigger: 'China extends REE export controls to NdPr metal; MP customers redirect to Lynas or Chinese processors',
      consensusGap: 'Market treats MP as commodity play. Strategic defense/robotics supply chain value and DoD optionality not captured in current multiples.',
    },
    triggers: [
      {
        category: 'policy',
        priority: 'immediate',
        headline: 'China REE export quota for Q2 2026 — reduction rumored',
        timestamp: 1741996800,
      },
      {
        category: 'hard-data',
        priority: 'watch',
        headline: 'MP Materials Stage III magnet plant production ramp update',
        timestamp: 1741824000,
      },
      {
        category: 'policy',
        priority: 'watch',
        headline: 'DoD Critical Materials procurement roadmap — FY2027 budget',
        timestamp: 1741564800,
      },
    ],
    alternatives: [
      {
        id: 'LYSDY',
        label: 'Lynas Rare Earths',
        feasibility: 'long-term',
        switchMonths: 18,
        costPremium: 0.20,
        perfDelta: -0.05,
        qualRequired: true,
        notes: 'Largest ex-China REE producer but Malaysian processing; magnet alloy not yet at volume',
      },
      {
        id: 'NEO',
        label: 'Neo Performance',
        feasibility: 'long-term',
        switchMonths: 24,
        costPremium: 0.15,
        perfDelta: -0.05,
        qualRequired: true,
        notes: 'NdFeB powder at commercial scale; Canada-based; qualification cycle required',
      },
    ],
  },

  AMAT: {
    financialExposure: {
      revenueAtRisk: 18.0,
      ebitdaImpact: 1.6,
      valuationSensitivity: 48.0,
      capacityLoss: 0.35,
      scenario: 'Etch/deposition tool supply disruption — fab expansion halted',
    },
    timeToImpact: {
      bucket: 'medium',
      days: 180,
      inventoryDays: 120,
      leadTimeDays: 90,
      switchDelayMonths: 18,
    },
    disruption: {
      dps3m: 0.08,
      dps12m: 0.28,
      confidence: 'medium',
      drivers: [
        'US-China WFE export restriction escalation',
        'China revenue >27% exposure',
        'Advanced etch duopoly with Lam/TEL',
        'TSMC fab dependency for advanced node tools',
      ],
    },
    capacity: {
      utilization: 80,
      css: 0.58,
      type: 'cyclical',
      leadTimeDays: 90,
      capexTrend: 'stable',
    },
    marketAngle: {
      mms: 'priced',
      bullTrigger: 'US CHIPS Act fab build-out accelerates WFE orders; gate-all-around transition drives upgrade cycle',
      bearTrigger: 'BIS expands WFE export controls to include additional tool categories; AMAT China revenue drops >50%',
      consensusGap: 'China revenue risk broadly understood. Upside from CHIPS Act cycle not fully modeled in 2026 estimates.',
    },
    triggers: [
      {
        category: 'policy',
        priority: 'watch',
        headline: 'BIS WFE export control rule update expected Q2 2026',
        timestamp: 1741824000,
      },
      {
        category: 'hard-data',
        priority: 'monitor',
        headline: 'AMAT Q1 FY2026 China revenue mix — threshold monitoring',
        timestamp: 1741564800,
      },
    ],
    alternatives: [
      {
        id: 'LRCX',
        label: 'Lam Research',
        feasibility: 'partial',
        switchMonths: 12,
        costPremium: 0.10,
        perfDelta: -0.05,
        qualRequired: true,
        notes: 'Partial overlap in etch; deposition tools have less substitutability',
      },
    ],
  },

  LRCX: {
    financialExposure: {
      revenueAtRisk: 15.0,
      ebitdaImpact: 1.3,
      valuationSensitivity: 39.0,
      capacityLoss: 0.30,
      scenario: 'Etch tool supply disruption — HBM and logic fab expansion constrained',
    },
    timeToImpact: {
      bucket: 'medium',
      days: 180,
      inventoryDays: 120,
      leadTimeDays: 90,
      switchDelayMonths: 18,
    },
    disruption: {
      dps3m: 0.08,
      dps12m: 0.28,
      confidence: 'medium',
      drivers: [
        'China revenue >31% exposure',
        'HBM stacking etch process monopoly',
        'Export control escalation risk',
        'Customer concentration in memory',
      ],
    },
    capacity: {
      utilization: 78,
      css: 0.55,
      type: 'cyclical',
      leadTimeDays: 90,
      capexTrend: 'stable',
    },
    marketAngle: {
      mms: 'priced',
      bullTrigger: 'HBM capacity expansion drives etch tool orders; memory upcycle supports 2x earnings recovery',
      bearTrigger: 'BIS expands etch tool controls; Lam loses China memory revenue permanently',
      consensusGap: 'China risk broadly priced. HBM etch process specificity — Lam near-monopoly position — underappreciated.',
    },
    triggers: [
      {
        category: 'policy',
        priority: 'watch',
        headline: 'BIS etch tool export control review — Lam China memory customers',
        timestamp: 1741824000,
      },
      {
        category: 'hard-data',
        priority: 'monitor',
        headline: 'Lam Q3 FY2026 deferred revenue and backlog — memory recovery signal',
        timestamp: 1741564800,
      },
    ],
    alternatives: [
      {
        id: 'AMAT',
        label: 'Applied Materials',
        feasibility: 'partial',
        switchMonths: 12,
        costPremium: 0.10,
        perfDelta: -0.05,
        qualRequired: true,
        notes: 'Partial etch substitution; HBM stacking specifically requires Lam Syndion tool class',
      },
    ],
  },

  ARM: {
    financialExposure: {
      revenueAtRisk: 28.0,
      ebitdaImpact: 2.5,
      valuationSensitivity: 75.0,
      capacityLoss: 0.50,
      scenario: 'ARM licensing disruption — all ARM-based chip designs halted',
    },
    timeToImpact: {
      bucket: 'structural',
      days: 720,
      inventoryDays: 365,
      leadTimeDays: 0,
      switchDelayMonths: 24,
    },
    disruption: {
      dps3m: 0.03,
      dps12m: 0.15,
      confidence: 'low',
      drivers: [
        'SoftBank ownership concentration risk',
        'Arm China historical licensing dispute',
        'RISC-V long-term substitution pressure',
        'Export control on Arm China entity',
      ],
    },
    capacity: {
      utilization: 0,
      css: 0.10,
      type: 'structural',
      leadTimeDays: 0,
      capexTrend: 'stable',
    },
    marketAngle: {
      mms: 'overpriced',
      bullTrigger: 'Arm v9 royalty rate acceleration; AI inference edge compute drives volume-royalty surge beyond current model',
      bearTrigger: 'RISC-V achieves datacenter software ecosystem parity; major hyperscaler announces server migration timeline',
      consensusGap: 'ARM trades at 80x+ forward earnings. Stock embeds perfect execution. Any RISC-V adoption acceleration or licensing dispute would cause significant multiple compression.',
    },
    triggers: [
      {
        category: 'market',
        priority: 'watch',
        headline: 'RISC-V International Summit — hyperscaler RISC-V roadmap disclosures',
        timestamp: 1741824000,
      },
      {
        category: 'policy',
        priority: 'monitor',
        headline: 'Arm China entity status — license renewal timeline',
        timestamp: 1741564800,
      },
    ],
    alternatives: [
      {
        id: 'INTC',
        label: 'RISC-V (open)',
        feasibility: 'long-term',
        switchMonths: 24,
        costPremium: -0.10,
        perfDelta: -0.15,
        qualRequired: false,
        notes: 'Ecosystem maturing; lacks ARM software compatibility; 2–3 year migration minimum',
      },
    ],
  },

  SNPS: {
    financialExposure: {
      revenueAtRisk: 35.0,
      ebitdaImpact: 3.0,
      valuationSensitivity: 90.0,
      capacityLoss: 0.80,
      scenario: 'EDA tool access disruption — all advanced chip design halted',
    },
    timeToImpact: {
      bucket: 'structural',
      days: 540,
      inventoryDays: 180,
      leadTimeDays: 30,
      switchDelayMonths: 24,
    },
    disruption: {
      dps3m: 0.03,
      dps12m: 0.12,
      confidence: 'low',
      drivers: [
        'US export control on EDA to China (active)',
        'Duopoly with Cadence — no third option at advanced nodes',
        'Ansys merger regulatory review risk',
        'Customer lock-in 18–24 month switching cycle',
      ],
    },
    capacity: {
      utilization: 0,
      css: 0.08,
      type: 'structural',
      leadTimeDays: 30,
      capexTrend: 'stable',
    },
    marketAngle: {
      mms: 'priced',
      bullTrigger: 'AI-driven EDA (generative chip design) accelerates adoption; Synopsys.ai platform drives ARPU expansion',
      bearTrigger: 'DOJ blocks Ansys merger; Chinese chip designers accelerate local EDA alternatives reducing Synopsys China revenue',
      consensusGap: 'Merger premium mostly priced. Long-term AI-EDA monetization not yet in numbers.',
    },
    triggers: [
      {
        category: 'policy',
        priority: 'watch',
        headline: 'DOJ Ansys merger review — decision expected Q3 2026',
        timestamp: 1741824000,
      },
      {
        category: 'policy',
        priority: 'monitor',
        headline: 'BIS EDA export control scope — any expansion would hit Synopsys China',
        timestamp: 1741564800,
      },
    ],
    alternatives: [
      {
        id: 'CDNS',
        label: 'Cadence Design Systems',
        feasibility: 'partial',
        switchMonths: 18,
        costPremium: 0.05,
        perfDelta: -0.10,
        qualRequired: false,
        notes: 'Partial tool substitution possible; full migration requires re-verification of all design IP — 18+ months',
      },
    ],
  },

  CDNS: {
    financialExposure: {
      revenueAtRisk: 30.0,
      ebitdaImpact: 2.6,
      valuationSensitivity: 78.0,
      capacityLoss: 0.75,
      scenario: 'EDA tool disruption — chip design pipeline halted at all customers',
    },
    timeToImpact: {
      bucket: 'structural',
      days: 540,
      inventoryDays: 180,
      leadTimeDays: 30,
      switchDelayMonths: 24,
    },
    disruption: {
      dps3m: 0.03,
      dps12m: 0.12,
      confidence: 'low',
      drivers: [
        'US-China EDA export control (active)',
        'Duopoly concentration with Synopsys',
        'Verification tool switching cost very high',
        'Custom silicon proliferation locks in Cadence',
      ],
    },
    capacity: {
      utilization: 0,
      css: 0.08,
      type: 'structural',
      leadTimeDays: 30,
      capexTrend: 'stable',
    },
    marketAngle: {
      mms: 'priced',
      bullTrigger: 'Custom silicon proliferation at hyperscalers drives multi-year verification tool demand; Palladium emulation backlog expands',
      bearTrigger: 'BIS expands EDA controls; Cadence China revenue (>15%) restricted permanently',
      consensusGap: 'Market understands Cadence moat. AI chip design wave upside not fully captured in 2026 consensus.',
    },
    triggers: [
      {
        category: 'policy',
        priority: 'monitor',
        headline: 'BIS EDA export control review — monitoring Cadence China exposure',
        timestamp: 1741824000,
      },
    ],
    alternatives: [
      {
        id: 'SNPS',
        label: 'Synopsys',
        feasibility: 'partial',
        switchMonths: 18,
        costPremium: 0.05,
        perfDelta: -0.10,
        qualRequired: false,
        notes: 'Cross-tool migration requires full re-sign-off; typically 18–24 month cycle for complex designs',
      },
    ],
  },

  VRT: {
    financialExposure: {
      revenueAtRisk: 12.0,
      ebitdaImpact: 1.0,
      valuationSensitivity: 30.0,
      capacityLoss: 0.20,
      scenario: 'Thermal management supply disruption — AI datacenter buildout constrained',
    },
    timeToImpact: {
      bucket: 'medium',
      days: 120,
      inventoryDays: 60,
      leadTimeDays: 90,
      switchDelayMonths: 12,
    },
    disruption: {
      dps3m: 0.06,
      dps12m: 0.22,
      confidence: 'low',
      drivers: [
        'Custom liquid cooling supply chain',
        'AI capex cycle demand sensitivity',
        'Power transformer supply constraints',
        'Skilled labor for DC deployment',
      ],
    },
    capacity: {
      utilization: 82,
      css: 0.64,
      type: 'cyclical',
      leadTimeDays: 90,
      capexTrend: 'expanding',
    },
    marketAngle: {
      mms: 'priced',
      bullTrigger: 'Hyperscaler liquid cooling retrofit wave drives Vertiv multi-year service contracts; thermal density increases with GB200',
      bearTrigger: 'AI capex cycle pauses; hyperscaler data center buildout slows 20%; Vertiv backlog burns without replenishment',
      consensusGap: 'Stock pricing near-perfect AI capex cycle execution. Any slowdown creates multiple compression risk.',
    },
    triggers: [
      {
        category: 'hard-data',
        priority: 'watch',
        headline: 'Vertiv order book Q1 2026 — watch for backlog deceleration signal',
        timestamp: 1741824000,
      },
      {
        category: 'market',
        priority: 'monitor',
        headline: 'Hyperscaler capex guidance revisions — Vertiv leading indicator',
        timestamp: 1741564800,
      },
    ],
    alternatives: [
      {
        id: 'AMD',
        label: 'Eaton / nVent (private)',
        feasibility: 'long-term',
        switchMonths: 18,
        costPremium: 0.15,
        perfDelta: -0.15,
        qualRequired: true,
        notes: 'Competing thermal management vendors exist but lack Vertiv integration; custom DC deployment requires full re-engineering',
      },
    ],
  },

  AMKR: {
    financialExposure: {
      revenueAtRisk: 8.0,
      ebitdaImpact: 0.7,
      valuationSensitivity: 21.0,
      capacityLoss: 0.20,
      scenario: 'Advanced packaging disruption — AI chip assembly constrained',
    },
    timeToImpact: {
      bucket: 'near',
      days: 75,
      inventoryDays: 45,
      leadTimeDays: 60,
      switchDelayMonths: 9,
    },
    disruption: {
      dps3m: 0.10,
      dps12m: 0.30,
      confidence: 'low',
      drivers: [
        'Korea/Philippines fab concentration',
        'Advanced packaging demand surge beyond capacity',
        'Limited flip-chip/SiP alternatives',
        'Customer concentration in NVDA/AAPL',
      ],
    },
    capacity: {
      utilization: 85,
      css: 0.68,
      type: 'cyclical',
      leadTimeDays: 60,
      capexTrend: 'expanding',
    },
    marketAngle: {
      mms: 'underpriced',
      bullTrigger: 'Advanced packaging becomes critical bottleneck; AMKR secures long-term NVDA packaging contract as TSMC overflow',
      bearTrigger: 'TSMC internalizes more advanced packaging; AMKR loses high-margin AI packaging volume',
      consensusGap: 'Market underestimates advanced packaging bottleneck. AMKR positioned as overflow valve for TSMC CoWoS — strategic value not reflected at 8x EV/EBITDA.',
    },
    triggers: [
      {
        category: 'hard-data',
        priority: 'watch',
        headline: 'Amkor Q1 2026 advanced packaging mix — AI vs mobile ratio',
        timestamp: 1741824000,
      },
    ],
    alternatives: [
      {
        id: 'TSM',
        label: 'TSMC InFO/CoWoS',
        feasibility: 'partial',
        switchMonths: 6,
        costPremium: -0.05,
        perfDelta: 0.10,
        qualRequired: true,
        notes: 'TSMC packaging preferred but constrained; Amkor serves as overflow — no true alternative for high-volume advanced packaging',
      },
    ],
  },

  KLAC: {
    financialExposure: {
      revenueAtRisk: 14.0,
      ebitdaImpact: 1.2,
      valuationSensitivity: 36.0,
      capacityLoss: 0.28,
      scenario: 'Process control disruption — advanced node yield optimization halted',
    },
    timeToImpact: {
      bucket: 'medium',
      days: 150,
      inventoryDays: 90,
      leadTimeDays: 90,
      switchDelayMonths: 18,
    },
    disruption: {
      dps3m: 0.07,
      dps12m: 0.25,
      confidence: 'medium',
      drivers: [
        'China revenue >25% exposure',
        'Process control near-monopoly at advanced nodes',
        'Export control escalation risk',
        'Single-source for certain defect inspection steps',
      ],
    },
    capacity: {
      utilization: 80,
      css: 0.58,
      type: 'cyclical',
      leadTimeDays: 90,
      capexTrend: 'stable',
    },
    marketAngle: {
      mms: 'priced',
      bullTrigger: 'Gate-all-around transition drives inspection tool intensity increase; KLA process control revenue per wafer expands',
      bearTrigger: 'BIS inspection tool controls expanded; KLA China revenue restricted permanently — 25% revenue at risk',
      consensusGap: 'China risk broadly understood. GAA process control intensity uplift under-modeled in consensus.',
    },
    triggers: [
      {
        category: 'policy',
        priority: 'watch',
        headline: 'BIS process control tool review — KLA monitoring',
        timestamp: 1741824000,
      },
      {
        category: 'hard-data',
        priority: 'monitor',
        headline: 'KLA Q2 FY2026 China revenue mix — threshold at 25%',
        timestamp: 1741564800,
      },
    ],
    alternatives: [
      {
        id: 'AMAT',
        label: 'Applied Materials metrology',
        feasibility: 'partial',
        switchMonths: 18,
        costPremium: 0.20,
        perfDelta: -0.25,
        qualRequired: true,
        notes: 'Partial inspection overlap; KLA optical inspection has no equivalent at advanced nodes',
      },
    ],
  },

  SSNLF: {
    financialExposure: {
      revenueAtRisk: 16.0,
      ebitdaImpact: 1.4,
      valuationSensitivity: 42.0,
      capacityLoss: 0.30,
      scenario: 'Samsung memory/foundry disruption — HBM and advanced node supply impacted',
    },
    timeToImpact: {
      bucket: 'near',
      days: 80,
      inventoryDays: 60,
      leadTimeDays: 90,
      switchDelayMonths: 12,
    },
    disruption: {
      dps3m: 0.14,
      dps12m: 0.42,
      confidence: 'medium',
      drivers: [
        'Korea geopolitical risk',
        'HBM3e yield issues delaying NVDA qualification',
        'Foundry share loss risk to TSMC',
        'Leadership transition and strategic uncertainty',
      ],
    },
    capacity: {
      utilization: 85,
      css: 0.64,
      type: 'cyclical',
      leadTimeDays: 90,
      capexTrend: 'expanding',
    },
    marketAngle: {
      mms: 'priced',
      bullTrigger: 'Samsung HBM3e achieves NVDA qualification; SF3E foundry wins major AI ASIC customer',
      bearTrigger: 'Samsung HBM4 execution fails; loses memory market share to SK Hynix permanently; foundry losses continue',
      consensusGap: 'Market aware of Samsung execution risk. Recovery potential underweighted if HBM qualification succeeds.',
    },
    triggers: [
      {
        category: 'hard-data',
        priority: 'watch',
        headline: 'Samsung HBM3e NVDA qualification status — industry sources',
        timestamp: 1741824000,
      },
      {
        category: 'news',
        priority: 'monitor',
        headline: 'Samsung SF3E customer win announcement timeline',
        timestamp: 1741564800,
      },
    ],
  },

  ATEYY: {
    financialExposure: {
      revenueAtRisk: 6.0,
      ebitdaImpact: 0.5,
      valuationSensitivity: 15.0,
      capacityLoss: 0.15,
      scenario: 'ATE disruption — GPU and HBM test capacity constrained',
    },
    timeToImpact: {
      bucket: 'medium',
      days: 150,
      inventoryDays: 90,
      leadTimeDays: 90,
      switchDelayMonths: 12,
    },
    disruption: {
      dps3m: 0.06,
      dps12m: 0.20,
      confidence: 'low',
      drivers: [
        'Japan yen volatility impact on exports',
        'Duopoly concentration with Teradyne',
        'HBM test system capacity tightness',
        'Japan manufacturing concentration',
      ],
    },
    capacity: {
      utilization: 82,
      css: 0.60,
      type: 'cyclical',
      leadTimeDays: 90,
      capexTrend: 'expanding',
    },
    marketAngle: {
      mms: 'priced',
      bullTrigger: 'HBM test system demand surge drives Advantest to record shipments; memory upcycle sustains multi-year order book',
      bearTrigger: 'Memory oversupply cycle reduces test equipment orders; Teradyne gains share in GPU testing',
      consensusGap: 'Market prices duopoly correctly. HBM test intensity upside not yet in consensus.',
    },
    triggers: [
      {
        category: 'hard-data',
        priority: 'monitor',
        headline: 'Advantest Q4 FY2026 ATE bookings — HBM test ratio',
        timestamp: 1741564800,
      },
    ],
    alternatives: [
      {
        id: 'TER',
        label: 'Teradyne',
        feasibility: 'short-term',
        switchMonths: 9,
        costPremium: 0.05,
        perfDelta: -0.05,
        qualRequired: true,
        notes: 'Duopoly partner; partial substitution possible but HBM test systems are specialized',
      },
    ],
  },

  TER: {
    financialExposure: {
      revenueAtRisk: 5.5,
      ebitdaImpact: 0.5,
      valuationSensitivity: 15.0,
      capacityLoss: 0.12,
      scenario: 'ATE disruption — semiconductor test throughput constrained',
    },
    timeToImpact: {
      bucket: 'medium',
      days: 150,
      inventoryDays: 90,
      leadTimeDays: 90,
      switchDelayMonths: 12,
    },
    disruption: {
      dps3m: 0.05,
      dps12m: 0.18,
      confidence: 'low',
      drivers: [
        'Robotics division separate from semiconductor (partial buffer)',
        'Duopoly with Advantest',
        'AI chip test complexity increasing demand',
        'Cyclical semiconductor test spend',
      ],
    },
    capacity: {
      utilization: 78,
      css: 0.54,
      type: 'cyclical',
      leadTimeDays: 90,
      capexTrend: 'stable',
    },
    marketAngle: {
      mms: 'priced',
      bullTrigger: 'GPU test complexity surge drives Teradyne UltraFLEX share gains; robotics division re-rated separately',
      bearTrigger: 'Semiconductor test market soft; robotics slow to ramp; both segments in simultaneous down-cycle',
      consensusGap: 'Sum-of-parts value for robotics + ATE not fully recognized. Test intensity per chip rising with AI complexity.',
    },
    triggers: [
      {
        category: 'hard-data',
        priority: 'monitor',
        headline: 'Teradyne Q1 2026 semiconductor test orders vs robotics — mix shift',
        timestamp: 1741564800,
      },
    ],
    alternatives: [
      {
        id: 'ATEYY',
        label: 'Advantest',
        feasibility: 'short-term',
        switchMonths: 9,
        costPremium: 0.05,
        perfDelta: -0.05,
        qualRequired: true,
        notes: 'Duopoly partner; overlap in GPU/ASIC testing; HBM-specific systems more differentiated',
      },
    ],
  },
};
