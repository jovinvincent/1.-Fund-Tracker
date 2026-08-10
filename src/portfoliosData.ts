export interface RawPortfolioHolding {
  name: string;
  symbol: string;
  weight: number;
  type: "equity" | "reit" | "derivative" | "commodity" | "debt" | "money_market" | "others";
  industry?: string;
  position?: "long" | "short";
}

export interface RawPortfolio {
  id: string;
  name: string;
  aum: string;
  typeTags: string[];
  dateRange: string;
  allocatedPct: number;
  cashPct: number;
  holdings: RawPortfolioHolding[];
}

export const PORTFOLIOS_RAW_DATA: RawPortfolio[] = [
  // 1. qsif Equity Long-Short Fund (Page 1-2)
  {
    id: "equity-long-short",
    name: "qsif Equity Long-Short Fund",
    aum: "₹758 cr",
    typeTags: ["equity", "derivatives"],
    dateRange: "as on 31 Jul 2026",
    allocatedPct: 78.70,
    cashPct: 21.30,
    holdings: [
      { name: "Adani Energy Solutions Limited", symbol: "ADANIENSOL.NS", weight: 8.06, type: "equity", industry: "Power" },
      { name: "Indus Towers Limited", symbol: "INDUSTOWER.NS", weight: 8.00, type: "equity", industry: "Telecom" },
      { name: "JSW Infrastructure Limited", symbol: "JSWINFRA.NS", weight: 6.80, type: "equity", industry: "Infrastructure" },
      { name: "Adani Green Energy Limited", symbol: "ADANIGREEN.NS", weight: 5.50, type: "equity", industry: "Power" },
      { name: "UPL Limited", symbol: "UPL.NS", weight: 4.62, type: "equity", industry: "Fertilizers & Agrochemicals" },
      { name: "MANGALORE REFINERY & PETROCHEMICALS", symbol: "MRPL.NS", weight: 3.90, type: "equity", industry: "Petroleum" },
      { name: "BLUE JET HEALTHCARE LTD", symbol: "BLUEJET.NS", weight: 3.50, type: "equity", industry: "Pharmaceuticals" },
      { name: "Capri Global Capital Limited", symbol: "CGCL.NS", weight: 3.05, type: "equity", industry: "Finance" },
      { name: "Reliance Industries Limited", symbol: "RELIANCE.NS", weight: 2.96, type: "equity", industry: "Petroleum" },
      { name: "Premier Energies Limited", symbol: "PREMIERENE.NS", weight: 2.95, type: "equity", industry: "Electrical Equipment" },
      { name: "Sona BLW Precision Forgings Limited", symbol: "SONACOMS.NS", weight: 2.94, type: "equity", industry: "Auto Components" },
      { name: "AWL Agri Business Limited", symbol: "AWL.NS", weight: 2.87, type: "equity", industry: "Agriculture" },
      { name: "Caliber Mining and Logistics Limited", symbol: "CALIBER.NS", weight: 2.59, type: "equity", industry: "Consumable Fuels" },
      { name: "Hexaware Technologies Limited", symbol: "HEXAWARE.NS", weight: 2.53, type: "equity", industry: "IT - Software" },
      { name: "IDBI Bank Limited", symbol: "IDBI.NS", weight: 2.39, type: "equity", industry: "Banks" },
      { name: "IPCA Laboratories Ltd", symbol: "IPCALAB.NS", weight: 2.18, type: "equity", industry: "Pharmaceuticals" },
      { name: "Aegis Logistics Limited", symbol: "AEGISLOG.NS", weight: 1.90, type: "equity", industry: "Gas" },
      { name: "Tata Chemicals Ltd", symbol: "TATACHEM.NS", weight: 1.89, type: "equity", industry: "Chemicals" },
      { name: "PTC India Limited", symbol: "PTC.NS", weight: 1.48, type: "equity", industry: "Power" },
      { name: "YES Bank Ltd.", symbol: "YESBANK.NS", weight: 1.48, type: "equity", industry: "Banks" },
      { name: "Sona BLW Precision Forgings Futures", symbol: "SONACOMS.NS", weight: 5.81, type: "derivative", industry: "Auto Components", position: "long" },
      { name: "Bajaj Finance Limited Futures Short", symbol: "BAJFINANCE.NS", weight: -1.60, type: "derivative", industry: "Finance", position: "short" },
      { name: "Cipla Limited Futures Short", symbol: "CIPLA.NS", weight: -2.08, type: "derivative", industry: "Pharmaceuticals", position: "short" },
      { name: "Eicher Motors Ltd Futures Short", symbol: "EICHERMOT.NS", weight: -2.70, type: "derivative", industry: "Automobiles", position: "short" },
      { name: "Biocon Ltd Futures Short", symbol: "BIOCON.NS", weight: -5.45, type: "derivative", industry: "Pharmaceuticals", position: "short" },
      { name: "Adani Energy Solutions Futures Short", symbol: "ADANIENSOL.NS", weight: -8.08, type: "derivative", industry: "Power", position: "short" },
      { name: "91 Days Treasury Bills", symbol: "TBILL_RATE", weight: 6.42, type: "money_market", industry: "Treasury" },
      { name: "qsif Sector Rotation Long-Short Fund-DG", symbol: "GILT_PROXY", weight: 0.67, type: "others", industry: "Mutual Fund" }
    ]
  },

  // 2. qsif Equity Ex-Top 100 Long-Short Fund (Page 5-6)
  {
    id: "equity-ex-top-100",
    name: "qsif Equity Ex-Top 100 Long-Short Fund",
    aum: "₹420 cr",
    typeTags: ["equity", "derivatives", "cash"],
    dateRange: "as on 31 Jul 2026",
    allocatedPct: 83.99,
    cashPct: 16.01,
    holdings: [
      { name: "Adani Energy Solutions Limited", symbol: "ADANIENSOL.NS", weight: 7.28, type: "equity", industry: "Power" },
      { name: "Caliber Mining and Logistics Limited", symbol: "CALIBER.NS", weight: 6.25, type: "equity", industry: "Consumable Fuels" },
      { name: "63 moons technologies limited", symbol: "63MOONS.NS", weight: 6.14, type: "equity", industry: "IT - Software" },
      { name: "Sona BLW Precision Forgings Limited", symbol: "SONACOMS.NS", weight: 6.08, type: "equity", industry: "Auto Components" },
      { name: "INDO-MIM Limited", symbol: "INDOMIM.NS", weight: 5.73, type: "equity", industry: "Industrial Manufacturing" },
      { name: "JSW Infrastructure Limited", symbol: "JSWINFRA.NS", weight: 5.24, type: "equity", industry: "Infrastructure" },
      { name: "Indus Towers Limited", symbol: "INDUSTOWER.NS", weight: 4.41, type: "equity", industry: "Telecom" },
      { name: "UPL Limited", symbol: "UPL.NS", weight: 3.36, type: "equity", industry: "Fertilizers & Agrochemicals" },
      { name: "Premier Energies Limited", symbol: "PREMIERENE.NS", weight: 2.91, type: "equity", industry: "Electrical Equipment" },
      { name: "Indegene Limited", symbol: "INDEGENE.NS", weight: 2.85, type: "equity", industry: "Healthcare" },
      { name: "KPIT Technologies Limited", symbol: "KPITTECH.NS", weight: 2.76, type: "equity", industry: "IT - Software" },
      { name: "IDBI Bank Limited", symbol: "IDBI.NS", weight: 2.71, type: "equity", industry: "Banks" },
      { name: "MANGALORE REFINERY & PETROCHEMICALS", symbol: "MRPL.NS", weight: 2.28, type: "equity", industry: "Petroleum" },
      { name: "Tata Chemicals Ltd", symbol: "TATACHEM.NS", weight: 2.04, type: "equity", industry: "Chemicals" },
      { name: "Sonata Software Limited", symbol: "SONATSOFTW.NS", weight: 1.77, type: "equity", industry: "IT - Software" },
      { name: "PTC India Limited", symbol: "PTC.NS", weight: 1.71, type: "equity", industry: "Power" },
      { name: "Poly Medicure Limited", symbol: "POLYMED.NS", weight: 1.57, type: "equity", industry: "Healthcare" },
      { name: "AWL Agri Business Limited", symbol: "AWL.NS", weight: 1.44, type: "equity", industry: "Agriculture" },
      { name: "Aegis Logistics Limited", symbol: "AEGISLOG.NS", weight: 1.41, type: "equity", industry: "Gas" },
      { name: "IRB Infrastructure Developers Limited", symbol: "IRB.NS", weight: 1.24, type: "equity", industry: "Construction" },
      { name: "BLUE JET HEALTHCARE LTD", symbol: "BLUEJET.NS", weight: 1.20, type: "equity", industry: "Pharmaceuticals" },
      { name: "SUN TV Network Limited", symbol: "SUNTV.NS", weight: 1.08, type: "equity", industry: "Entertainment" },
      { name: "Afcons Infrastructure Limited", symbol: "AFCONS.NS", weight: 0.99, type: "equity", industry: "Construction" },
      { name: "Biocon Ltd Futures Short", symbol: "BIOCON.NS", weight: -2.49, type: "derivative", industry: "Pharmaceuticals", position: "short" },
      { name: "KPIT Technologies Futures Short", symbol: "KPITTECH.NS", weight: -2.73, type: "derivative", industry: "IT - Software", position: "short" },
      { name: "Multi Commodity Exchange Futures Short", symbol: "MCX.NS", weight: -2.77, type: "derivative", industry: "Capital Markets", position: "short" },
      { name: "Adani Energy Solutions Futures Short", symbol: "ADANIENSOL.NS", weight: -7.29, type: "derivative", industry: "Power", position: "short" },
      { name: "91 Days Treasury Bills", symbol: "TBILL_RATE", weight: 6.15, type: "money_market", industry: "Treasury" }
    ]
  },

  // 3. qsif Sector Rotation Long-Short Fund (Page 3-4)
  {
    id: "sector-rotation",
    name: "qsif Sector Rotation Long-Short Fund",
    aum: "₹49 cr",
    typeTags: ["equity", "derivatives"],
    dateRange: "as on 31 Jul 2026",
    allocatedPct: 79.62,
    cashPct: 20.38,
    holdings: [
      { name: "GMR Airports Limited", symbol: "GMRAIRPORT.NS", weight: 9.54, type: "equity", industry: "Infrastructure" },
      { name: "Adani Ports & Special Economic Zone Ltd", symbol: "ADANIPORTS.NS", weight: 9.46, type: "equity", industry: "Infrastructure" },
      { name: "Indus Towers Limited", symbol: "INDUSTOWER.NS", weight: 9.29, type: "equity", industry: "Telecom" },
      { name: "Bharti Airtel Limited", symbol: "BHARTIARTL.NS", weight: 9.18, type: "equity", industry: "Telecom" },
      { name: "Vodafone Idea Ltd.", symbol: "IDEA.NS", weight: 9.18, type: "equity", industry: "Telecom" },
      { name: "United Spirits Limited", symbol: "MCDOWELL-N.NS", weight: 9.11, type: "equity", industry: "Beverages" },
      { name: "Nestle India Limited", symbol: "NESTLEIND.NS", weight: 8.80, type: "equity", industry: "FMCG" },
      { name: "JSW Infrastructure Limited", symbol: "JSWINFRA.NS", weight: 8.46, type: "equity", industry: "Infrastructure" },
      { name: "Interglobe Aviation Limited", symbol: "INDIGO.NS", weight: 7.82, type: "equity", industry: "Transport Services" },
      { name: "Interglobe Aviation Futures Short", symbol: "INDIGO.NS", weight: -7.85, type: "derivative", industry: "Transport Services", position: "short" },
      { name: "Nestle India Limited Futures Short", symbol: "NESTLEIND.NS", weight: -8.71, type: "derivative", industry: "FMCG", position: "short" },
      { name: "Vodafone Idea Ltd. Futures Short", symbol: "IDEA.NS", weight: -9.04, type: "derivative", industry: "Telecom", position: "short" },
      { name: "Bharti Airtel Limited Futures Short", symbol: "BHARTIARTL.NS", weight: -9.08, type: "derivative", industry: "Telecom", position: "short" },
      { name: "United Spirits Limited Futures Short", symbol: "MCDOWELL-N.NS", weight: -9.13, type: "derivative", industry: "Beverages", position: "short" },
      { name: "Adani Ports & SEZ Futures Short", symbol: "ADANIPORTS.NS", weight: -9.50, type: "derivative", industry: "Infrastructure", position: "short" },
      { name: "GMR Airports Limited Futures Short", symbol: "GMRAIRPORT.NS", weight: -9.57, type: "derivative", industry: "Infrastructure", position: "short" },
      { name: "91 Days Treasury Bills", symbol: "TBILL_RATE", weight: 8.19, type: "money_market", industry: "Treasury" }
    ]
  },

  // 4. qsif Active Asset Allocator Long-Short Fund (Page 7-8)
  {
    id: "active-asset-allocator",
    name: "qsif Active Asset Allocator Long-Short Fund",
    aum: "₹167 cr",
    typeTags: ["equity", "derivatives", "cash"],
    dateRange: "as on 31 Jul 2026",
    allocatedPct: 47.76,
    cashPct: 52.24,
    holdings: [
      { name: "INDO-MIM Limited", symbol: "INDOMIM.NS", weight: 9.59, type: "equity", industry: "Industrial Manufacturing" },
      { name: "Adani Energy Solutions Limited", symbol: "ADANIENSOL.NS", weight: 7.91, type: "equity", industry: "Power" },
      { name: "Adani Green Energy Limited", symbol: "ADANIGREEN.NS", weight: 4.80, type: "equity", industry: "Power" },
      { name: "JSW Infrastructure Limited", symbol: "JSWINFRA.NS", weight: 4.29, type: "equity", industry: "Infrastructure" },
      { name: "Caliber Mining and Logistics Limited", symbol: "CALIBER.NS", weight: 3.92, type: "equity", industry: "Consumable Fuels" },
      { name: "Indus Towers Limited", symbol: "INDUSTOWER.NS", weight: 2.98, type: "equity", industry: "Telecom" },
      { name: "Capri Global Capital Limited", symbol: "CGCL.NS", weight: 2.71, type: "equity", industry: "Finance" },
      { name: "UPL Limited", symbol: "UPL.NS", weight: 2.37, type: "equity", industry: "Fertilizers & Agrochemicals" },
      { name: "LIC Housing Finance Ltd", symbol: "LICHSGFIN.NS", weight: 1.40, type: "equity", industry: "Finance" },
      { name: "Hexaware Technologies Limited", symbol: "HEXAWARE.NS", weight: 1.40, type: "equity", industry: "IT - Software" },
      { name: "MANGALORE REFINERY & PETROCHEMICALS", symbol: "MRPL.NS", weight: 1.21, type: "equity", industry: "Petroleum" },
      { name: "BLUE JET HEALTHCARE LTD", symbol: "BLUEJET.NS", weight: 0.13, type: "equity", industry: "Pharmaceuticals" },
      { name: "Bajaj Finance Limited Futures Short", symbol: "BAJFINANCE.NS", weight: -1.54, type: "derivative", industry: "Finance", position: "short" },
      { name: "Cipla Limited Futures Short", symbol: "CIPLA.NS", weight: -1.69, type: "derivative", industry: "Pharmaceuticals", position: "short" },
      { name: "Eicher Motors Ltd Futures Short", symbol: "EICHERMOT.NS", weight: -1.97, type: "derivative", industry: "Automobiles", position: "short" },
      { name: "Biocon Ltd Futures Short", symbol: "BIOCON.NS", weight: -2.36, type: "derivative", industry: "Pharmaceuticals", position: "short" },
      { name: "Adani Energy Solutions Futures Short", symbol: "ADANIENSOL.NS", weight: -7.91, type: "derivative", industry: "Power", position: "short" },
      { name: "91 Days Treasury Bills", symbol: "TBILL_RATE", weight: 5.04, type: "money_market", industry: "Treasury" }
    ]
  },

  // 5. qsif Hybrid Long-Short Fund (Page 9-10) [Replaces quant Multi Asset Allocation Fund]
  {
    id: "hybrid-long-short",
    name: "qsif Hybrid Long-Short Fund",
    aum: "₹214 cr",
    typeTags: ["hybrid", "equity", "debt", "reit", "invit"],
    dateRange: "as on 31 Jul 2026",
    allocatedPct: 74.73,
    cashPct: 25.27,
    holdings: [
      { name: "Adani Energy Solutions Limited", symbol: "ADANIENSOL.NS", weight: 8.58, type: "equity", industry: "Power" },
      { name: "JSW Infrastructure Limited", symbol: "JSWINFRA.NS", weight: 6.51, type: "equity", industry: "Infrastructure" },
      { name: "Caliber Mining and Logistics Limited", symbol: "CALIBER.NS", weight: 6.14, type: "equity", industry: "Consumable Fuels" },
      { name: "Bagmane Prime Office REIT", symbol: "BAGMANE.REIT", weight: 4.92, type: "reit", industry: "Realty" },
      { name: "PTC India Limited", symbol: "PTC.NS", weight: 3.50, type: "equity", industry: "Power" },
      { name: "Tata Chemicals Ltd", symbol: "TATACHEM.NS", weight: 2.37, type: "equity", industry: "Chemicals" },
      { name: "Gabriel India Limited", symbol: "GABRIEL.NS", weight: 1.65, type: "equity", industry: "Automotive" },
      { name: "Sonata Software Limited", symbol: "SONATSOFTW.NS", weight: 1.55, type: "equity", industry: "IT - Software" },
      { name: "Indegene Limited", symbol: "INDEGENE.NS", weight: 1.44, type: "equity", industry: "Healthcare" },
      { name: "Welspun Enterprises Limited", symbol: "WELENT.NS", weight: 1.07, type: "equity", industry: "Construction" },
      { name: "Poly Medicure Limited", symbol: "POLYMED.NS", weight: 1.03, type: "equity", industry: "Healthcare" },
      { name: "BLUE JET HEALTHCARE LTD", symbol: "BLUEJET.NS", weight: 0.61, type: "equity", industry: "Pharmaceuticals" },
      { name: "UPL Limited Future Long", symbol: "UPL.NS", weight: 2.50, type: "derivative", industry: "Agrochemicals", position: "long" },
      { name: "Bajaj Finance Limited Futures Short", symbol: "BAJFINANCE.NS", weight: -1.61, type: "derivative", industry: "Finance", position: "short" },
      { name: "Cipla Limited Futures Short", symbol: "CIPLA.NS", weight: -1.64, type: "derivative", industry: "Pharmaceuticals", position: "short" },
      { name: "Eicher Motors Ltd Futures Short", symbol: "EICHERMOT.NS", weight: -1.99, type: "derivative", industry: "Automobiles", position: "short" },
      { name: "Biocon Ltd Futures Short", symbol: "BIOCON.NS", weight: -2.70, type: "derivative", industry: "Pharmaceuticals", position: "short" },
      { name: "Adani Energy Solutions Futures Short", symbol: "ADANIENSOL.NS", weight: -8.59, type: "derivative", industry: "Power", position: "short" },
      { name: "6.28% GOI Sovereign Bond 14-Jul-2032", symbol: "IN10YT=RR", weight: 4.61, type: "debt", industry: "Sovereign Debt" },
      { name: "Muthoot Finance Ltd Commercial Paper", symbol: "CP_RATE", weight: 4.65, type: "money_market", industry: "Commercial Paper" },
      { name: "SIDBI Certificate of Deposit", symbol: "CD_RATE", weight: 6.91, type: "money_market", industry: "Certificate of Deposit" },
      { name: "Canara Bank Certificate of Deposit", symbol: "CD_RATE", weight: 4.40, type: "money_market", industry: "Certificate of Deposit" },
      { name: "364 Days Treasury Bill 12-Nov-2026", symbol: "TBILL_RATE", weight: 2.30, type: "money_market", industry: "Treasury" },
      { name: "364 Days Treasury Bill 06-May-2027", symbol: "TBILL_RATE", weight: 2.24, type: "money_market", industry: "Treasury" },
      { name: "India Grid Trust (InvIT)", symbol: "INDIGRID.NS", weight: 5.64, type: "others", industry: "Power InvIT" },
      { name: "Citius TransNet Investment Trust (InvIT)", symbol: "CITIUS.INVIT", weight: 2.05, type: "others", industry: "Transport InvIT" },
      { name: "Raajmarg Infra Investment Trust (InvIT)", symbol: "RAAJMARG.INVIT", weight: 1.91, type: "others", industry: "Transport InvIT" },
      { name: "Cube Highways Trust InvIT", symbol: "CUBE.INVIT", weight: 0.66, type: "others", industry: "Transport InvIT" }
    ]
  }
];
