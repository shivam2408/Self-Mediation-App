
/**
 * Formats milliseconds into human readable strings:
 * - Under 60s: "ss.s"
 * - Over 60s: "m:ss.s"
 */
export const formatTime = (ms: number): string => {
  const seconds = ms / 1000;
  
  if (seconds < 60) {
    return seconds.toFixed(1) + 's';
  }
  
  const mins = Math.floor(seconds / 60);
  const remainingSecs = (seconds % 60).toFixed(1);
  const paddedSecs = parseFloat(remainingSecs) < 10 ? `0${remainingSecs}` : remainingSecs;
  
  return `${mins}:${paddedSecs}`;
};

/**
 * High precision formatter for pure seconds
 */
export const formatDuration = (ms: number): string => {
    const totalSeconds = ms / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
