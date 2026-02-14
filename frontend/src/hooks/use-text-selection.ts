import { useState, useEffect, useCallback, RefObject } from "react";

interface SelectionState {
  text: string;
  x: number;
  y: number;
  visible: boolean;
}

export function useTextSelection(containerRef: RefObject<HTMLElement | null>) {
  const [selection, setSelection] = useState<SelectionState>({
    text: "",
    x: 0,
    y: 0,
    visible: false,
  });

  const dismiss = useCallback(() => {
    setSelection((prev) => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    function handleMouseUp() {
      const sel = window.getSelection();
      const text = sel?.toString().trim() || "";

      if (text.length < 3) {
        return;
      }

      // Check if the selection is inside our container (checked at event time)
      if (containerRef.current && sel?.rangeCount) {
        const range = sel.getRangeAt(0);
        if (!containerRef.current.contains(range.commonAncestorContainer)) {
          return;
        }

        const rect = range.getBoundingClientRect();
        // Use document coordinates (viewport + scroll offset) for absolute positioning
        setSelection({
          text,
          x: rect.left + window.scrollX + rect.width / 2,
          y: rect.top + window.scrollY,
          visible: true,
        });
      }
    }

    // Listen on document so it works even if the container mounts later
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [containerRef]);

  return { selection, dismiss };
}
