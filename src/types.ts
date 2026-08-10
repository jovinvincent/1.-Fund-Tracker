export type AssetType = "equity" | "reit" | "derivative" | "commodity" | "debt" | "money_market" | "others" | "mutual_fund";

export interface Holding {
  id: string;
  name: string;
  symbol: string; // Ticker or proxy
  type: AssetType;
  quantity: number;
  avgPrice: number;
  position: "long" | "short";
  isin: string;
  rating: string;
  industry: string;
  weight: number;
  ytm: string | null;
  marketValueLakhs: number;
  subCategory?: string;
}

export interface LiveStats {
  currentPrice: number;
  previousClose: number;
  dailyChangePercent: number;
  dailyChangeAmount: number;
  currentValue: number;
  investedValue: number;
  totalGainLossAmount: number;
  totalGainLossPercent: number;
  isEstimate: boolean;
  lastUpdated: string;
}

export interface HoldingWithLiveStats extends Holding, LiveStats {}

export interface PortfolioSummary {
  totalInvested: number;
  totalCurrent: number;
  dailyChangeAmount: number;
  dailyChangePercent: number;
  totalGainLossAmount: number;
  totalGainLossPercent: number;
}

export interface Portfolio {
  id: string;
  name: string;
  aum: string;
  typeTags: string[];
  dateRange: string;
  allocatedPct: number;
  cashPct: number;
  holdings: Holding[];
  holdingsWithLiveStats?: HoldingWithLiveStats[];
  summary?: PortfolioSummary;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  name: string;
  source: string;
}

export interface MFQuote {
  schemeCode: string;
  schemeName: string;
  nav: number;
  date: string;
  isinGrowth: string;
}

export interface IndexProxy {
  symbol: string;
  price: number;
  changePercent: number;
}
