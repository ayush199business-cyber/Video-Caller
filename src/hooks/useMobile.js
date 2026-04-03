import { useState, useEffect } from 'react';

/**
 * Shared hook for responsive mobile detection.
 * Replaces the duplicated useEffect pattern in Room.jsx and WhiteboardPage.jsx.
 */
export const useMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);

  return isMobile;
};
