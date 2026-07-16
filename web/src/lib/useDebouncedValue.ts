"use client";

import { useEffect, useState } from "react";

// Returns `value` only after it has stopped changing for `delay` ms. Used to keep
// free-text filter inputs from firing a network request on every keystroke.
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
