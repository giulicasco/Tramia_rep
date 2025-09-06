import { useEffect, useRef, useState } from "react";

export function useAnimatedNumber(value: number, duration = 400) {
  const [display, setDisplay] = useState(value);
  const refFrom = useRef(value);
  
  useEffect(() => {
    const start = performance.now();
    const from = refFrom.current;
    const diff = value - from;
    let raf = 0;
    
    const step = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      setDisplay(from + diff * p);
      if (p < 1) raf = requestAnimationFrame(step);
      else refFrom.current = value;
    };
    
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  
  return Math.round(display);
}