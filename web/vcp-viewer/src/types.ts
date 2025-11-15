export interface PriceBar {
  date: string;
  close: number;
  volume: number;
}

export interface Stock {
  symbol: string;
  name: string;
  close: number;
  volume: number;
  marketCap: number;
  beta: number;
  perfWeek: number;
  perfMonth: number;
  perfYear: number;
  sma200: number;
  priceHistory: PriceBar[];
}

export interface VCPZone {
  start: number;
  end: number;
  high: number;
  low: number;
}
