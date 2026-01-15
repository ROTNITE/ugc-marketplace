"use client";

import { useEffect, useRef, type ReactNode } from "react";

type MessageScrollProps = {
  children: ReactNode;
  scrollTargetId?: string | null;
  scrollKey?: number;
};

export function MessageScroll({ children, scrollTargetId, scrollKey }: MessageScrollProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = scrollTargetId ? document.getElementById(scrollTargetId) : null;
    if (target) {
      target.scrollIntoView({ block: "start" });
      return;
    }
    endRef.current?.scrollIntoView({ block: "end" });
  }, [scrollTargetId, scrollKey]);

  return (
    <div className="space-y-3">
      {children}
      <div ref={endRef} />
    </div>
  );
}
