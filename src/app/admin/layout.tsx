import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Link className="font-semibold text-foreground" href="/admin">
              Admin
            </Link>
            <Link className="hover:text-foreground" href="/admin/jobs?status=PENDING">
              Модерация заказов
            </Link>
            <Link className="hover:text-foreground" href="/admin/creators?status=PENDING">
              Верификация креаторов
            </Link>
            <Link className="hover:text-foreground" href="/admin/disputes?status=OPEN">
              Споры
            </Link>
            <Link className="hover:text-foreground" href="/admin/payouts?status=PENDING">
              Выплаты
            </Link>
            <Link className="hover:text-foreground" href="/admin/finance">
              Финансы
            </Link>
            <Link className="hover:text-foreground" href="/admin/settings">
              Настройки
            </Link>
            <Link className="hover:text-foreground" href="/admin/events?processed=unprocessed">
              События
            </Link>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
