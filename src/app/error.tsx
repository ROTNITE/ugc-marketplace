"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center space-y-4">
      <h1 className="text-2xl font-semibold">Что-то пошло не так</h1>
      <p className="text-muted-foreground text-sm">
        Это MVP-скелет. Ошибка зафиксирована в консоли. Нажмите “Повторить” или вернитесь на главную.
      </p>
      <div className="flex items-center justify-center gap-2">
        <Button onClick={reset}>Повторить</Button>
        <a href="/" className="inline-flex">
          <Button variant="outline">На главную</Button>
        </a>
      </div>
    </div>
  );
}
