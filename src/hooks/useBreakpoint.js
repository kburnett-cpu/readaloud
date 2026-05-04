import { useState, useEffect } from "react";

function getBreakpoint(width) {
  if (width >= 1024) return "desktop";
  if (width >= 640)  return "tablet";
  return "mobile";
}

export default function useBreakpoint() {
  const [bp, setBp] = useState(() =>
    typeof window !== "undefined"
      ? getBreakpoint(window.innerWidth)
      : "mobile"
  );

  useEffect(() => {
    let timer;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setBp(getBreakpoint(window.innerWidth));
      }, 100);
    };

    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return bp;
}
