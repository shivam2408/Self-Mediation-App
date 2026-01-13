
export interface IntervalRecord {
  id: number;
  duration: number; // in milliseconds
  timestamp: number;
}

export interface SessionRecord {
  id: number;
  date: string; // ISO string
  intervals: IntervalRecord[];
  totalDuration: number;
  thoughtCount: number;
  longestGap: number;
  avgGap: number;
}

export interface SessionStats {
  thoughtCount: number;
  averageInterval: number;
  longestInterval: number;
  totalDuration: number;
}
