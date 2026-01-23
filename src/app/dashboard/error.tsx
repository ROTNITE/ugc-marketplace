"use client";

import Link from "next/link";
import { useEffect } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error boundary:", error?.message);
  }, [error]);

  return (
    <Container size="sm" className="py-10">
      <EmptyState
        title="Что-то пошло не так"
        description="Произошла ошибка при загрузке кабинета."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={reset}>Попробовать снова</Button>
            <Link href="/dashboard">
              <Button variant="outline">В кабинет</Button>
            </Link>
          </div>
        }
      />
    </Container>
  );
}
