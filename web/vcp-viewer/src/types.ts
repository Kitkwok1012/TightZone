export interface PriceBar {
  date: string;
  close: number;
  volume: number;
}

export interface StockNewsItem {
  title: string;
  url: string;
  publisher: string;
  summary?: string;
  publishedAt: string;
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
  news?: StockNewsItem[];
}

export interface VCPZone {
  start: number;
  end: number;
  high: number;
  low: number;
}
