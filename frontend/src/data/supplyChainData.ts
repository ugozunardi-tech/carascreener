// ============================================================
// NVIDIA Supply Chain Intelligence — TypeScript Data Module
// Drop this file into your Claude Code project as:
//   src/data/supplyChainData.ts
// ============================================================

export type RiskLevel = 'crit' | 'hi' | 'med' | 'low' | 'target';
export type ExchangeType = 'us' | 'jp' | 'tw' | 'kr' | 'eu' | 'au' | 'hk' | 'cn' | 'private';
export type EdgeType = 'critical' | 'high' | 'med' | 'low';

export interface SupplyChainNode {
  id: string;
  name: string;
  ticker: string;
  tv: string | null;           // TradingView symbol e.g. "NASDAQ:NVDA"
  ibkr: string | null;         // IBKR symbol
  exchange: string;
  extype: ExchangeType;
  layer: string;               // e.g. "L1", "L-1", "L2"
  layer_label: string;         // human readable sub-label
  risk: RiskLevel;
  geo: string;
  country_code: string;        // ISO 2-letter
  role: string;
  revenue_at_risk_b?: number;  // USD billions
  bottleneck_score?: number;   // 0–10
  substitutability?: number;   // 0–10
  utilization_pct?: number;    // 0–100
}

export interface SupplyChainEdge {
  source: string;   // node id
  target: string;   // node id
  weight: number;   // 1–10, used for edge thickness
  type: EdgeType;
  label: string;
}

export interface RawMaterial {
  symbol: string;
  name: string;
  risk: RiskLevel;
  china_control_pct: number;
  criticality: number;  // 0–10
  export_ban?: boolean;
  key_suppliers: string[];  // node ids
}

// ─── NODES ────────────────────────────────────────────────
export const NODES: SupplyChainNode[] = [
  { id:"nvda", name:"NVIDIA", ticker:"NVDA", tv:"NASDAQ:NVDA", ibkr:"NVDA", exchange:"NASDAQ", extype:"us", layer:"L0", layer_label:"Target", risk:"target", geo:"USA", country_code:"US", role:"GPU design, CUDA, NVLink, NVSwitch. Fabless." },

  // L-2 Mining & Silicon
  { id:"shin_etsu", name:"Shin-Etsu Chemical", ticker:"4063.T", tv:"TSE:4063", ibkr:"4063", exchange:"TSE Tokyo", extype:"jp", layer:"L-2", layer_label:"Wafer/RE", risk:"hi", geo:"Japan", country_code:"JP", role:"Wafer silicio 300mm ~30% quota + fotoresist EUV", bottleneck_score:6.5, substitutability:5 },
  { id:"sumco", name:"SUMCO Corporation", ticker:"3436.T", tv:"TSE:3436", ibkr:"3436", exchange:"TSE Tokyo", extype:"jp", layer:"L-2", layer_label:"Wafer", risk:"hi", geo:"Japan", country_code:"JP", role:"Wafer silicio ~26% quota globale", bottleneck_score:6.0, substitutability:5 },
  { id:"globalwafers", name:"GlobalWafers", ticker:"6488.TW", tv:"TWSE:6488", ibkr:"6488", exchange:"TWSE Taiwan", extype:"tw", layer:"L-2", layer_label:"Wafer", risk:"med", geo:"Taiwan", country_code:"TW", role:"Wafer silicio ~17% quota. 29 plant globali.", bottleneck_score:4.5, substitutability:6 },
  { id:"siltronic", name:"Siltronic AG", ticker:"WAF.DE", tv:"XETRA:WAF", ibkr:"WAF", exchange:"XETRA Frankfurt", extype:"eu", layer:"L-2", layer_label:"Wafer", risk:"med", geo:"Germany", country_code:"DE", role:"Wafer epitassiali 300mm ~13% quota", bottleneck_score:4.0, substitutability:6 },
  { id:"wacker", name:"Wacker Chemie", ticker:"WCH.DE", tv:"XETRA:WCH", ibkr:"WCH", exchange:"XETRA Frankfurt", extype:"eu", layer:"L-2", layer_label:"PolySi", risk:"med", geo:"Germany", country_code:"DE", role:"Polisiliconio high-purity per wafer", bottleneck_score:3.0, substitutability:5 },
  { id:"mp_materials", name:"MP Materials", ticker:"MP", tv:"NYSE:MP", ibkr:"MP", exchange:"NYSE", extype:"us", layer:"L-2", layer_label:"RE Mining", risk:"low", geo:"USA", country_code:"US", role:"Mountain Pass CA — unica miniera RE scalabile USA", bottleneck_score:3.0, substitutability:4 },
  { id:"lynas", name:"Lynas Rare Earths", ticker:"LYC.AX", tv:"ASX:LYC", ibkr:"LYC", exchange:"ASX Sydney", extype:"au", layer:"L-2", layer_label:"RE Mining", risk:"med", geo:"Australia", country_code:"AU", role:"Maggior RE producer fuori Cina. Contratto DoD.", bottleneck_score:3.5, substitutability:4 },
  { id:"glencore", name:"Glencore", ticker:"GLEN.L", tv:"LSE:GLEN", ibkr:"GLEN", exchange:"LSE London", extype:"eu", layer:"L-2", layer_label:"Mining", risk:"hi", geo:"Switzerland", country_code:"CH", role:"Cobalto DRC + rame globale. Top mining.", bottleneck_score:5.0, substitutability:5 },
  { id:"freeport", name:"Freeport-McMoRan", ticker:"FCX", tv:"NYSE:FCX", ibkr:"FCX", exchange:"NYSE", extype:"us", layer:"L-2", layer_label:"Cu Mining", risk:"med", geo:"USA", country_code:"US", role:"Top 3 rame globale. Grasberg, Cerro Verde.", bottleneck_score:4.0, substitutability:6 },
  { id:"umicore", name:"Umicore", ticker:"UMI.BR", tv:"EBR:UMI", ibkr:"UMI", exchange:"Euronext Brussels", extype:"eu", layer:"L-2", layer_label:"Refining", risk:"med", geo:"Belgium", country_code:"BE", role:"Raffinatore cobalto, germanio, Pd, Au", bottleneck_score:4.5, substitutability:5 },
  { id:"bhp", name:"BHP Group", ticker:"BHP", tv:"NYSE:BHP", ibkr:"BHP", exchange:"NYSE / ASX", extype:"us", layer:"L-2", layer_label:"Mining", risk:"low", geo:"Australia", country_code:"AU", role:"Rame, nichel, minerali critici per semiconduttori", bottleneck_score:2.5, substitutability:7 },

  // L-1 Chemistry
  { id:"jsr", name:"JSR Corporation", ticker:"PRIVATE", tv:null, ibkr:null, exchange:"Delisted giu 2024 — privatizzata JIC", extype:"private", layer:"L-1", layer_label:"Fotoresist", risk:"crit", geo:"Japan", country_code:"JP", role:"Fotoresist EUV ~27% quota. Nazionalizzata 2024.", bottleneck_score:9.0, substitutability:2 },
  { id:"tok", name:"Tokyo Ohka Kogyo (TOK)", ticker:"4186.T", tv:"TSE:4186", ibkr:"4186", exchange:"TSE Tokyo", extype:"jp", layer:"L-1", layer_label:"Fotoresist", risk:"crit", geo:"Japan", country_code:"JP", role:"Fotoresist #1 ~30% quota + coater EUV", bottleneck_score:9.2, substitutability:1 },
  { id:"fujifilm", name:"Fujifilm Holdings", ticker:"4901.T", tv:"TSE:4901", ibkr:"4901", exchange:"TSE Tokyo", extype:"jp", layer:"L-1", layer_label:"Fotoresist/CMP", risk:"hi", geo:"Japan", country_code:"JP", role:"Fotoresist EUV + PSPI RDL + CMP slurry Cu", bottleneck_score:7.5, substitutability:3 },
  { id:"sumitomo_chem", name:"Sumitomo Chemical", ticker:"4005.T", tv:"TSE:4005", ibkr:"4005", exchange:"TSE Tokyo", extype:"jp", layer:"L-1", layer_label:"Fotoresist", risk:"med", geo:"Japan", country_code:"JP", role:"Fotoresist EUV + MOR per sub-2nm", bottleneck_score:5.5, substitutability:4 },
  { id:"adeka", name:"Adeka Corporation", ticker:"4401.T", tv:"TSE:4401", ibkr:"4401", exchange:"TSE Tokyo", extype:"jp", layer:"L-1", layer_label:"MOR/ALD", risk:"med", geo:"Japan", country_code:"JP", role:"Metal-oxide resist MOR 2nm + precursori ALD", bottleneck_score:4.5, substitutability:4 },
  { id:"entegris", name:"Entegris", ticker:"ENTG", tv:"NASDAQ:ENTG", ibkr:"ENTG", exchange:"NASDAQ", extype:"us", layer:"L-1", layer_label:"CMP/Chemicals", risk:"hi", geo:"USA", country_code:"US", role:"CMP slurry+pad leader. Accordo TSMC N3.", bottleneck_score:7.8, substitutability:3 },
  { id:"dupont", name:"DuPont / QNITY", ticker:"DD", tv:"NYSE:DD", ibkr:"DD", exchange:"NYSE", extype:"us", layer:"L-1", layer_label:"CMP Pad", risk:"hi", geo:"USA", country_code:"US", role:"CMP pad >50% quota. Spinoff QNITY 2025.", bottleneck_score:7.5, substitutability:3 },
  { id:"fujimi", name:"Fujimi Incorporated", ticker:"5384.T", tv:"TSE:5384", ibkr:"5384", exchange:"TSE Tokyo", extype:"jp", layer:"L-1", layer_label:"CMP", risk:"med", geo:"Japan", country_code:"JP", role:"CMP slurry FEOL. PLANERLITE series.", bottleneck_score:5.0, substitutability:5 },
  { id:"resonac", name:"Resonac Holdings", ticker:"4004.T", tv:"TSE:4004", ibkr:"4004", exchange:"TSE Tokyo", extype:"jp", layer:"L-1", layer_label:"CMP/Gas/Pkg", risk:"hi", geo:"Japan", country_code:"JP", role:"CMP Cu + gas NF3 + ABF + NCF underfill.", bottleneck_score:7.8, substitutability:3 },
  { id:"merck_kgaa", name:"Merck KGaA", ticker:"MRK.DE", tv:"XETRA:MRK", ibkr:"MRK", exchange:"XETRA Frankfurt", extype:"eu", layer:"L-1", layer_label:"Chemicals", risk:"hi", geo:"Germany", country_code:"DE", role:"CMP slurry + gas fluorurati + ALD precursori HfO2", bottleneck_score:7.0, substitutability:4 },
  { id:"basf", name:"BASF SE", ticker:"BAS.DE", tv:"XETRA:BAS", ibkr:"BAS", exchange:"XETRA Frankfurt", extype:"eu", layer:"L-1", layer_label:"Chemicals", risk:"med", geo:"Germany", country_code:"DE", role:"SELECTIPUR etch + FOTOPUR clean", bottleneck_score:4.5, substitutability:5 },
  { id:"air_liquide", name:"Air Liquide", ticker:"AI.PA", tv:"EURONEXT:AI", ibkr:"AI", exchange:"Euronext Paris", extype:"eu", layer:"L-1", layer_label:"Gas", risk:"hi", geo:"France", country_code:"FR", role:"Gas ALD NF3 HF etching. On-site TSMC.", bottleneck_score:7.5, substitutability:3 },
  { id:"linde", name:"Linde plc", ticker:"LIN", tv:"NYSE:LIN", ibkr:"LIN", exchange:"NYSE / XETRA", extype:"us", layer:"L-1", layer_label:"Gas", risk:"hi", geo:"Germany/USA", country_code:"DE", role:"Gas ultra-puri litografia, etching, ALD.", bottleneck_score:7.5, substitutability:3 },
  { id:"apd", name:"Air Products", ticker:"APD", tv:"NYSE:APD", ibkr:"APD", exchange:"NYSE", extype:"us", layer:"L-1", layer_label:"Gas", risk:"med", geo:"USA", country_code:"US", role:"Gas processo completo fab.", bottleneck_score:5.0, substitutability:4 },
  { id:"nippon_sanso", name:"Nippon Sanso / Matheson", ticker:"4091.T", tv:"TSE:4091", ibkr:"4091", exchange:"TSE Tokyo", extype:"jp", layer:"L-1", layer_label:"Gas", risk:"med", geo:"Japan/USA", country_code:"JP", role:"Gas fab completo. Matheson = divisione US.", bottleneck_score:5.0, substitutability:4 },
  { id:"central_glass", name:"Central Glass", ticker:"4932.T", tv:"TSE:4932", ibkr:"4932", exchange:"TSE Tokyo", extype:"jp", layer:"L-1", layer_label:"Gas WF6", risk:"crit", geo:"Japan", country_code:"JP", role:"WF6 quasi monopolio per deposizione CVD tungsteno", bottleneck_score:8.5, substitutability:1 },
  { id:"stella_chemifa", name:"Stella Chemifa", ticker:"4109.T", tv:"TSE:4109", ibkr:"4109", exchange:"TSE Tokyo", extype:"jp", layer:"L-1", layer_label:"HF", risk:"hi", geo:"Japan", country_code:"JP", role:"HF ultra-puro oligopolio per etching wafer", bottleneck_score:7.5, substitutability:2 },
  { id:"kanto_chem", name:"Kanto Chemical", ticker:"4979.T", tv:"TSE:4979", ibkr:"4979", exchange:"TSE Tokyo", extype:"jp", layer:"L-1", layer_label:"Etchants", risk:"hi", geo:"Japan", country_code:"JP", role:"Etchant, CMP cleaner — presente in ogni fab TSMC", bottleneck_score:7.0, substitutability:3 },

  // L0 Equipment
  { id:"asml", name:"ASML", ticker:"ASML", tv:"NASDAQ:ASML", ibkr:"ASML", exchange:"NASDAQ / AEX", extype:"us", layer:"L0", layer_label:"EUV Monopoly", risk:"crit", geo:"Netherlands", country_code:"NL", role:"Monopolio EUV. $200M+/macchina. Export ctrl NL/USA.", bottleneck_score:9.8, substitutability:0 },
  { id:"tel", name:"Tokyo Electron (TEL)", ticker:"8035.T", tv:"TSE:8035", ibkr:"8035", exchange:"TSE Tokyo", extype:"jp", layer:"L0", layer_label:"Coater 88%", risk:"crit", geo:"Japan", country_code:"JP", role:"Coater/developer fotoresist 88% quota. Etch/dep.", bottleneck_score:9.5, substitutability:1 },
  { id:"amat", name:"Applied Materials", ticker:"AMAT", tv:"NASDAQ:AMAT", ibkr:"AMAT", exchange:"NASDAQ", extype:"us", layer:"L0", layer_label:"Equipment", risk:"hi", geo:"USA", country_code:"US", role:"CVD/ALD/PVD deposizione + CMP tool. Export ctrl Cina.", bottleneck_score:8.0, substitutability:3 },
  { id:"lrcx", name:"Lam Research", ticker:"LRCX", tv:"NASDAQ:LRCX", ibkr:"LRCX", exchange:"NASDAQ", extype:"us", layer:"L0", layer_label:"Etching", risk:"hi", geo:"USA", country_code:"US", role:"Etching plasma #1 mondiale. Export ctrl Cina.", bottleneck_score:8.0, substitutability:3 },
  { id:"klac", name:"KLA Corporation", ticker:"KLAC", tv:"NASDAQ:KLAC", ibkr:"KLAC", exchange:"NASDAQ", extype:"us", layer:"L0", layer_label:"Metrologia", risk:"hi", geo:"USA", country_code:"US", role:"Ispezione wafer e yield management. Ubiquo in fab.", bottleneck_score:7.8, substitutability:3 },
  { id:"asmi", name:"ASM International", ticker:"ASMI", tv:"NASDAQ:ASMI", ibkr:"ASMI", exchange:"NASDAQ / AEX", extype:"us", layer:"L0", layer_label:"ALD", risk:"hi", geo:"Netherlands", country_code:"NL", role:"ALD leader: HfO2 high-k gate per N3", bottleneck_score:7.5, substitutability:3 },
  { id:"ter", name:"Teradyne", ticker:"TER", tv:"NASDAQ:TER", ibkr:"TER", exchange:"NASDAQ", extype:"us", layer:"L0", layer_label:"Test ATE", risk:"med", geo:"USA", country_code:"US", role:"ATE per test GPU H100/B200", bottleneck_score:5.5, substitutability:4 },
  { id:"advantest", name:"Advantest", ticker:"6857.T", tv:"TSE:6857", ibkr:"6857", exchange:"TSE Tokyo", extype:"jp", layer:"L0", layer_label:"Test ATE", risk:"med", geo:"Japan", country_code:"JP", role:"ATE per HBM e chip avanzati. Forte domanda AI 2025.", bottleneck_score:5.5, substitutability:4 },

  // L1 Foundry
  { id:"tsm", name:"TSMC", ticker:"TSM", tv:"NYSE:TSM", ibkr:"TSM", exchange:"NYSE ADR / TWSE:2330", extype:"us", layer:"L1", layer_label:"Foundry", risk:"crit", geo:"Taiwan", country_code:"TW", role:"N3/N5: B200, H200, Grace, NVSwitch. Sole-source.", revenue_at_risk_b:12.1, bottleneck_score:9.2, substitutability:1, utilization_pct:90 },
  { id:"samsung_foundry", name:"Samsung Foundry", ticker:"005930.KS", tv:"KRX:005930", ibkr:"005930", exchange:"KRX Seoul", extype:"kr", layer:"L1", layer_label:"Foundry alt.", risk:"med", geo:"South Korea", country_code:"KR", role:"3GAE alternativa speculativa + HBM memoria", bottleneck_score:3.0, substitutability:3 },
  { id:"gfs", name:"GlobalFoundries", ticker:"GFS", tv:"NASDAQ:GFS", ibkr:"GFS", exchange:"NASDAQ", extype:"us", layer:"L1", layer_label:"Foundry mature", risk:"low", geo:"USA", country_code:"US", role:"Nodi maturi 22-28nm. No GPU avanzati NVIDIA.", bottleneck_score:1.5, substitutability:7 },

  // L2 Packaging
  { id:"ase", name:"ASE Technology (SPIL)", ticker:"ASX", tv:"NYSE:ASX", ibkr:"ASX", exchange:"NYSE ADR / TWSE:3711", extype:"us", layer:"L2", layer_label:"OSAT", risk:"hi", geo:"Taiwan", country_code:"TW", role:"OSAT #1 globale. CoWoP dev. Capex AI 2025.", bottleneck_score:7.5, substitutability:3, utilization_pct:82 },
  { id:"amkr", name:"Amkor Technology", ticker:"AMKR", tv:"NASDAQ:AMKR", ibkr:"AMKR", exchange:"NASDAQ", extype:"us", layer:"L2", layer_label:"OSAT", risk:"hi", geo:"USA", country_code:"US", role:"OSAT #2. Arizona CoWoS expansion. $850M capex 2025.", bottleneck_score:6.5, substitutability:4, utilization_pct:78 },
  { id:"ajinomoto", name:"Ajinomoto Co.", ticker:"2802.T", tv:"TSE:2802", ibkr:"2802", exchange:"TSE Tokyo", extype:"jp", layer:"L2", layer_label:"ABF Film", risk:"crit", geo:"Japan", country_code:"JP", role:"ABF Film quasi monopolio per substrati IC avanzati", bottleneck_score:9.0, substitutability:1 },
  { id:"panasonic", name:"Panasonic Holdings", ticker:"6752.T", tv:"TSE:6752", ibkr:"6752", exchange:"TSE Tokyo", extype:"jp", layer:"L2", layer_label:"ABF/LMC", risk:"med", geo:"Japan", country_code:"JP", role:"ABF + LMC mold compound per packaging", bottleneck_score:4.5, substitutability:5 },
  { id:"toray", name:"Toray Industries", ticker:"3402.T", tv:"TSE:3402", ibkr:"3402", exchange:"TSE Tokyo", extype:"jp", layer:"L2", layer_label:"Film", risk:"med", geo:"Japan", country_code:"JP", role:"Materiali film per packaging.", bottleneck_score:4.0, substitutability:5 },
  { id:"resonac_pkg", name:"Resonac (Packaging)", ticker:"4004.T", tv:"TSE:4004", ibkr:"4004", exchange:"TSE Tokyo", extype:"jp", layer:"L2", layer_label:"ABF/NCF", risk:"hi", geo:"Japan", country_code:"JP", role:"ABF + NCF underfill + CMP Cu slurry", bottleneck_score:7.8, substitutability:3 },
  { id:"henkel", name:"Henkel AG", ticker:"HEN3.DE", tv:"XETRA:HEN3", ibkr:"HEN3", exchange:"XETRA Frankfurt", extype:"eu", layer:"L2", layer_label:"Underfill", risk:"med", geo:"Germany", country_code:"DE", role:"Underfill epossidici + NCF + TIM materiali", bottleneck_score:4.5, substitutability:5 },
  { id:"3m", name:"3M Company", ticker:"MMM", tv:"NYSE:MMM", ibkr:"MMM", exchange:"NYSE", extype:"us", layer:"L2", layer_label:"TIM/Film", risk:"med", geo:"USA", country_code:"US", role:"TIM + film dielettrici + adesivi packaging", bottleneck_score:4.0, substitutability:5 },
  { id:"asahi_kasei", name:"Asahi Kasei", ticker:"3407.T", tv:"TSE:3407", ibkr:"3407", exchange:"TSE Tokyo", extype:"jp", layer:"L2", layer_label:"PSPI", risk:"med", geo:"Japan", country_code:"JP", role:"PSPI alternativo per RDL packaging", bottleneck_score:4.0, substitutability:5 },

  // L3 Memory
  { id:"sk_hynix", name:"SK Hynix", ticker:"000660.KS", tv:"KRX:000660", ibkr:"000660", exchange:"KRX Seoul", extype:"kr", layer:"L3", layer_label:"HBM Primary", risk:"crit", geo:"South Korea", country_code:"KR", role:"HBM3e primario ~50-60% share NVIDIA.", revenue_at_risk_b:6.2, bottleneck_score:7.8, substitutability:4, utilization_pct:85 },
  { id:"mu", name:"Micron Technology", ticker:"MU", tv:"NASDAQ:MU", ibkr:"MU", exchange:"NASDAQ", extype:"us", layer:"L3", layer_label:"HBM Secondary", risk:"hi", geo:"USA", country_code:"US", role:"HBM3e secondario. Target 20-25% share 2025.", bottleneck_score:5.5, substitutability:5 },
  { id:"samsung_mem", name:"Samsung Memory", ticker:"005930.KS", tv:"KRX:005930", ibkr:"005930", exchange:"KRX Seoul", extype:"kr", layer:"L3", layer_label:"HBM Tertiary", risk:"med", geo:"South Korea", country_code:"KR", role:"HBM3e in qualificazione. Yield issues.", bottleneck_score:3.5, substitutability:5 },

  // L4 Substrates/PCB
  { id:"ibiden", name:"Ibiden Co.", ticker:"4062.T", tv:"TSE:4062", ibkr:"4062", exchange:"TSE Tokyo", extype:"jp", layer:"L4", layer_label:"FC-BGA", risk:"hi", geo:"Japan", country_code:"JP", role:"FC-BGA substrati Top 3 mondiale.", bottleneck_score:7.0, substitutability:3 },
  { id:"shinko", name:"Shinko Electric", ticker:"6967.T", tv:"TSE:6967", ibkr:"6967", exchange:"TSE Tokyo", extype:"jp", layer:"L4", layer_label:"FC-BGA", risk:"hi", geo:"Japan", country_code:"JP", role:"FC-BGA Tier 1. ~35% quota combined JP.", bottleneck_score:7.0, substitutability:3 },
  { id:"unimicron", name:"Unimicron Technology", ticker:"3037.TW", tv:"TWSE:3037", ibkr:"3037", exchange:"TWSE Taiwan", extype:"tw", layer:"L4", layer_label:"FC-BGA", risk:"hi", geo:"Taiwan", country_code:"TW", role:"Substrati IC leader Taiwan ~22% quota.", bottleneck_score:6.5, substitutability:4 },
  { id:"nanya_pcb", name:"Nan Ya PCB", ticker:"8046.TW", tv:"TWSE:8046", ibkr:"8046", exchange:"TWSE Taiwan", extype:"tw", layer:"L4", layer_label:"Substrati", risk:"med", geo:"Taiwan", country_code:"TW", role:"Substrati + PCB high-layer. Formosa Group.", bottleneck_score:5.0, substitutability:5 },
  { id:"ats", name:"AT&S", ticker:"ATS.VI", tv:"WBAG:ATS", ibkr:"ATS", exchange:"Wiener Börse Vienna", extype:"eu", layer:"L4", layer_label:"Substrati EU", risk:"med", geo:"Austria", country_code:"AT", role:"Substrati avanzati europei. Espansione India + Germania.", bottleneck_score:4.0, substitutability:5 },
  { id:"ttmi", name:"TTM Technologies", ticker:"TTMI", tv:"NASDAQ:TTMI", ibkr:"TTMI", exchange:"NASDAQ", extype:"us", layer:"L4", layer_label:"PCB", risk:"med", geo:"USA", country_code:"US", role:"PCB high-performance server GPU + HPC USA", bottleneck_score:4.5, substitutability:5 },
  { id:"murata", name:"Murata Manufacturing", ticker:"6981.T", tv:"TSE:6981", ibkr:"6981", exchange:"TSE Tokyo", extype:"jp", layer:"L4", layer_label:"MLCC", risk:"hi", geo:"Japan", country_code:"JP", role:"MLCC #1 mondiale. Centinaia per ogni GPU board.", bottleneck_score:6.5, substitutability:4 },
  { id:"tdk", name:"TDK Corporation", ticker:"6762.T", tv:"TSE:6762", ibkr:"6762", exchange:"TSE Tokyo", extype:"jp", layer:"L4", layer_label:"MLCC/Magneti", risk:"hi", geo:"Japan", country_code:"JP", role:"MLCC + induttori + magneti NdFeB fan rack", bottleneck_score:6.5, substitutability:4 },
  { id:"yageo", name:"Yageo Corporation", ticker:"2327.TW", tv:"TWSE:2327", ibkr:"2327", exchange:"TWSE Taiwan", extype:"tw", layer:"L4", layer_label:"MLCC/Res.", risk:"med", geo:"Taiwan", country_code:"TW", role:"MLCC + resistori + KEMET tantalum", bottleneck_score:4.5, substitutability:5 },
  { id:"sem", name:"Samsung Electro-Mechanics", ticker:"009150.KS", tv:"KRX:009150", ibkr:"009150", exchange:"KRX Seoul", extype:"kr", layer:"L4", layer_label:"MLCC", risk:"med", geo:"South Korea", country_code:"KR", role:"MLCC premium coreano + ABF substrati AI.", bottleneck_score:4.5, substitutability:5 },

  // L5 System
  { id:"aph", name:"Amphenol", ticker:"APH", tv:"NYSE:APH", ibkr:"APH", exchange:"NYSE", extype:"us", layer:"L5", layer_label:"Connettori", risk:"hi", geo:"USA", country_code:"US", role:"Connettori NVLink backplane. +57% YoY Q2 2025.", bottleneck_score:7.0, substitutability:4 },
  { id:"tel_conn", name:"TE Connectivity", ticker:"TEL", tv:"NYSE:TEL", ibkr:"TEL", exchange:"NYSE", extype:"us", layer:"L5", layer_label:"Connettori", risk:"hi", geo:"USA/Switzerland", country_code:"US", role:"Connettori board-to-board + busbar 48V NVSwitch", bottleneck_score:6.5, substitutability:4 },
  { id:"vrt", name:"Vertiv Holdings", ticker:"VRT", tv:"NYSE:VRT", ibkr:"VRT", exchange:"NYSE", extype:"us", layer:"L5", layer_label:"Power/Cooling", risk:"hi", geo:"USA", country_code:"US", role:"PDU + precision cooling AI rack. Crescita esplosiva.", bottleneck_score:6.5, substitutability:4 },
  { id:"mpwr", name:"Monolithic Power Sys.", ticker:"MPWR", tv:"NASDAQ:MPWR", ibkr:"MPWR", exchange:"NASDAQ", extype:"us", layer:"L5", layer_label:"VRM", risk:"med", geo:"USA", country_code:"US", role:"VRM originale H100. NVIDIA ha diversificato 2024.", bottleneck_score:4.0, substitutability:6 },
  { id:"txn", name:"Texas Instruments", ticker:"TXN", tv:"NASDAQ:TXN", ibkr:"TXN", exchange:"NASDAQ", extype:"us", layer:"L5", layer_label:"VRM", risk:"med", geo:"USA", country_code:"US", role:"VRM GPU Blackwell (scelto da NVIDIA 2024)", bottleneck_score:4.0, substitutability:6 },
  { id:"ifx", name:"Infineon Technologies", ticker:"IFX.DE", tv:"XETRA:IFX", ibkr:"IFX", exchange:"XETRA Frankfurt", extype:"eu", layer:"L5", layer_label:"Power", risk:"med", geo:"Germany", country_code:"DE", role:"VRM + MOSFET + NovaStar power modules AI rack", bottleneck_score:4.5, substitutability:5 },
  { id:"vicr", name:"Vicor Corporation", ticker:"VICR", tv:"NASDAQ:VICR", ibkr:"VICR", exchange:"NASDAQ", extype:"us", layer:"L5", layer_label:"Power", risk:"med", geo:"USA", country_code:"US", role:"Power modules 48V→1V alta efficienza rack AI", bottleneck_score:4.0, substitutability:5 },
  { id:"nvts", name:"Navitas Semiconductor", ticker:"NVTS", tv:"NASDAQ:NVTS", ibkr:"NVTS", exchange:"NASDAQ", extype:"us", layer:"L5", layer_label:"GaN Power", risk:"low", geo:"USA", country_code:"US", role:"GaN IC per 800V HVDC. Alta efficienza rack AI.", bottleneck_score:2.5, substitutability:6 },
  { id:"cohr", name:"Coherent Corp.", ticker:"COHR", tv:"NYSE:COHR", ibkr:"COHR", exchange:"NYSE", extype:"us", layer:"L5", layer_label:"Ottica", risk:"med", geo:"USA", country_code:"US", role:"Moduli ottici 800G + CPO futuro AI cluster", bottleneck_score:4.5, substitutability:4 },
  { id:"lite", name:"Lumentum Holdings", ticker:"LITE", tv:"NASDAQ:LITE", ibkr:"LITE", exchange:"NASDAQ", extype:"us", layer:"L5", layer_label:"Ottica", risk:"med", geo:"USA", country_code:"US", role:"Laser e moduli ottici high-speed cluster AI", bottleneck_score:4.0, substitutability:5 },
  { id:"accton", name:"Accton Technology", ticker:"2345.TW", tv:"TWSE:2345", ibkr:"2345", exchange:"TWSE Taiwan", extype:"tw", layer:"L5", layer_label:"Networking", risk:"med", geo:"Taiwan", country_code:"TW", role:"Switch fabric NVLink. Usato da AWS per GB200.", bottleneck_score:4.5, substitutability:5 },
  { id:"asetek", name:"Asetek", ticker:"ASTEK.OL", tv:"OSLO:ASETEK", ibkr:"ASTEK", exchange:"Oslo Børs", extype:"eu", layer:"L5", layer_label:"Liquid Cooling", risk:"hi", geo:"Denmark", country_code:"DK", role:"CDU + AIO liquid cooling. Partner Dell/Supermicro GPU.", bottleneck_score:6.0, substitutability:4 },

  // L6 ODM/OEM
  { id:"foxconn", name:"Foxconn / Hon Hai", ticker:"2317.TW", tv:"TWSE:2317", ibkr:"2317", exchange:"TWSE Taiwan", extype:"tw", layer:"L6", layer_label:"ODM", risk:"hi", geo:"Taiwan", country_code:"TW", role:"ODM #1 GB200 NVL72 rack completo. AI +200% YoY.", bottleneck_score:6.5, substitutability:4 },
  { id:"smci", name:"Supermicro (SMCI)", ticker:"SMCI", tv:"NASDAQ:SMCI", ibkr:"SMCI", exchange:"NASDAQ", extype:"us", layer:"L6", layer_label:"Server AI", risk:"hi", geo:"USA", country_code:"US", role:"Server AI partner NVIDIA. Problemi audit 2024.", bottleneck_score:6.0, substitutability:4 },
  { id:"quanta", name:"Quanta Computer", ticker:"2382.TW", tv:"TWSE:2382", ibkr:"2382", exchange:"TWSE Taiwan", extype:"tw", layer:"L6", layer_label:"ODM", risk:"hi", geo:"Taiwan", country_code:"TW", role:"ODM per Google, Meta. HGX H100/H200 volume.", bottleneck_score:6.0, substitutability:4 },
  { id:"wistron", name:"Wistron Corporation", ticker:"3231.TW", tv:"TWSE:3231", ibkr:"3231", exchange:"TWSE Taiwan", extype:"tw", layer:"L6", layer_label:"ODM", risk:"med", geo:"Taiwan", country_code:"TW", role:"ODM AWS, Microsoft. Espansione India.", bottleneck_score:5.0, substitutability:5 },
  { id:"dell", name:"Dell Technologies", ticker:"DELL", tv:"NYSE:DELL", ibkr:"DELL", exchange:"NYSE", extype:"us", layer:"L6", layer_label:"OEM", risk:"med", geo:"USA", country_code:"US", role:"OEM PowerEdge XE9680 8x H100/H200 enterprise", bottleneck_score:4.0, substitutability:5 },
  { id:"hpe", name:"HPE", ticker:"HPE", tv:"NYSE:HPE", ibkr:"HPE", exchange:"NYSE", extype:"us", layer:"L6", layer_label:"OEM", risk:"med", geo:"USA", country_code:"US", role:"OEM ProLiant AI + Cray supercomputer", bottleneck_score:4.0, substitutability:5 },
  { id:"lenovo", name:"Lenovo Group", ticker:"0992.HK", tv:"HKEX:992", ibkr:"992", exchange:"HKEX Hong Kong", extype:"hk", layer:"L6", layer_label:"OEM", risk:"med", geo:"China/Global", country_code:"HK", role:"OEM globale. ThinkSystem SR680a V3.", bottleneck_score:3.5, substitutability:6 },
  { id:"cls", name:"Celestica", ticker:"CLS", tv:"NYSE:CLS", ibkr:"CLS", exchange:"NYSE / TSX", extype:"us", layer:"L6", layer_label:"EMS/Design", risk:"med", geo:"Canada", country_code:"CA", role:"Switch fabric AI + server custom per CSP.", bottleneck_score:4.5, substitutability:5 },
  { id:"jbl", name:"Jabil Inc.", ticker:"JBL", tv:"NYSE:JBL", ibkr:"JBL", exchange:"NYSE", extype:"us", layer:"L6", layer_label:"EMS", risk:"low", geo:"USA", country_code:"US", role:"EMS subassembly server AI. PCB assembly volume.", bottleneck_score:2.5, substitutability:7 },
];

// ─── EDGES ───────────────────────────────────────────────
export const EDGES: SupplyChainEdge[] = [
  { source:"nvda", target:"tsm", weight:10, type:"critical", label:"N3/N5 wafer sole-source" },
  { source:"nvda", target:"sk_hynix", weight:8, type:"critical", label:"HBM3e primary ~55%" },
  { source:"nvda", target:"ase", weight:7, type:"high", label:"CoWoS OSAT" },
  { source:"nvda", target:"amkr", weight:6, type:"high", label:"CoWoS Arizona" },
  { source:"nvda", target:"mu", weight:6, type:"high", label:"HBM3e secondary" },
  { source:"nvda", target:"ajinomoto", weight:7, type:"critical", label:"ABF Film" },
  { source:"nvda", target:"ibiden", weight:5, type:"high", label:"FC-BGA substrati" },
  { source:"tsm", target:"asml", weight:10, type:"critical", label:"EUV machines" },
  { source:"tsm", target:"tel", weight:9, type:"critical", label:"Coater/developer 88%" },
  { source:"tsm", target:"amat", weight:8, type:"high", label:"CVD/ALD equipment" },
  { source:"tsm", target:"lrcx", weight:8, type:"high", label:"Etch plasma" },
  { source:"tsm", target:"klac", weight:7, type:"high", label:"Inspection/metrology" },
  { source:"tsm", target:"tok", weight:9, type:"critical", label:"Fotoresist EUV" },
  { source:"tsm", target:"entegris", weight:8, type:"high", label:"CMP slurry+pad" },
  { source:"tsm", target:"central_glass", weight:8, type:"critical", label:"WF6 monopolio" },
  { source:"tsm", target:"air_liquide", weight:7, type:"high", label:"Process gases" },
  { source:"tsm", target:"shin_etsu", weight:7, type:"high", label:"Wafer 300mm" },
  { source:"tsm", target:"ajinomoto", weight:8, type:"critical", label:"ABF Film" },
  { source:"sk_hynix", target:"shin_etsu", weight:6, type:"high", label:"Wafer silicio" },
  { source:"asml", target:"asmi", weight:7, type:"high", label:"ALD HfO2" },
];

// ─── RAW MATERIALS ────────────────────────────────────────
export const RAW_MATERIALS: RawMaterial[] = [
  { symbol:"Si", name:"Silicio", risk:"low", china_control_pct:15, criticality:3, key_suppliers:["shin_etsu","sumco","globalwafers"] },
  { symbol:"Ga", name:"Gallio", risk:"crit", china_control_pct:98.8, criticality:10, export_ban:true, key_suppliers:[] },
  { symbol:"Ge", name:"Germanio", risk:"crit", china_control_pct:59.2, criticality:9, export_ban:true, key_suppliers:["umicore"] },
  { symbol:"Nd", name:"Neodimio/RE", risk:"crit", china_control_pct:85, criticality:9, export_ban:true, key_suppliers:["mp_materials","lynas"] },
  { symbol:"W",  name:"Tungsteno", risk:"hi", china_control_pct:80, criticality:7, key_suppliers:[] },
  { symbol:"Ta", name:"Tantalio", risk:"hi", china_control_pct:20, criticality:7, key_suppliers:[] },
  { symbol:"Co", name:"Cobalto", risk:"hi", china_control_pct:70, criticality:6, key_suppliers:["glencore","umicore"] },
  { symbol:"Pd", name:"Palladio", risk:"hi", china_control_pct:5, criticality:6, key_suppliers:[] },
  { symbol:"Cu", name:"Rame", risk:"low", china_control_pct:8, criticality:3, key_suppliers:["freeport","bhp","glencore"] },
];

// ─── HELPER FUNCTIONS ─────────────────────────────────────

/** Get a node by id */
export const getNode = (id: string): SupplyChainNode | undefined =>
  NODES.find(n => n.id === id);

/** Get all nodes for a given layer */
export const getNodesByLayer = (layer: string): SupplyChainNode[] =>
  NODES.filter(n => n.layer === layer);

/** Get all edges for a given node (as source or target) */
export const getEdgesForNode = (id: string): SupplyChainEdge[] =>
  EDGES.filter(e => e.source === id || e.target === id);

/** Get all critical nodes (risk === 'crit') sorted by bottleneck_score desc */
export const getCriticalNodes = (): SupplyChainNode[] =>
  NODES.filter(n => n.risk === 'crit')
       .sort((a, b) => (b.bottleneck_score ?? 0) - (a.bottleneck_score ?? 0));

/** Get total revenue at risk across all critical nodes */
export const getTotalRevenueAtRisk = (): number =>
  NODES.reduce((sum, n) => sum + (n.revenue_at_risk_b ?? 0), 0);

/** Get TradingView URL for a node */
export const getTVUrl = (node: SupplyChainNode): string | null =>
  node.tv ? `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(node.tv)}` : null;

/** Get IBKR search URL for a node */
export const getIBKRUrl = (node: SupplyChainNode): string | null =>
  node.ibkr ? `https://www.interactivebrokers.com/en/trading/search-for-stocks.php?query=${encodeURIComponent(node.ibkr)}` : null;

/** Get nodes with tradeable tickers (not private) */
export const getTradeableNodes = (): SupplyChainNode[] =>
  NODES.filter(n => n.extype !== 'private' && n.tv !== null);

