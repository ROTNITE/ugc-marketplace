"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  notificationId: string;
};

export function MarkReadButton({ notificationId }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function markRead() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/notifications/${notificationId}/read`, { method: "POST" });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={markRead} disabled={isLoading}>
      {isLoading ? "..." : "Прочитано"}
    </Button>
  );
}
