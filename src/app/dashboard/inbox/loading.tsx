import Link from "next/link";
import { Container } from "@/components/ui/container";
import { DataList, DataListItem } from "@/components/ui/data-list";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function InboxLoading() {
  return (
    <Container className="py-10 space-y-6" motion>
      <PageHeader
        title="Сообщения"
        description="Все диалоги и переписки по заказам."
        eyebrow={
          <Link className="hover:text-foreground" href="/dashboard">
            В кабинет
          </Link>
        }
      />

      <DataList className="space-y-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <DataListItem key={index} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-56" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-10 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-3 w-72" />
              <Skeleton className="h-8 w-20" />
            </div>
          </DataListItem>
        ))}
      </DataList>
    </Container>
  );
}
