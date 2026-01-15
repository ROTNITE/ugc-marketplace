import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center space-y-4">
      <h1 className="text-3xl font-semibold">404</h1>
      <p className="text-muted-foreground">Страница не найдена.</p>
      <Link href="/">
        <Button variant="outline">На главную</Button>
      </Link>
    </div>
  );
}
