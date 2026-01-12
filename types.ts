
export interface IntervalRecord {
  id: number;
  duration: number; // in milliseconds
  timestamp: number;
}

export interface SessionStats {
  thoughtCount: number;
  averageInterval: number;
  longestInterval: number;
  totalDuration: number;
}
