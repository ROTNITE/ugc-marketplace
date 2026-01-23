import Link from "next/link";
import { Container } from "@/components/ui/container";
import { DataList, DataListItem } from "@/components/ui/data-list";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function InvitationsLoading() {
  return (
    <Container size="lg" className="py-10 space-y-6">
      <PageHeader
        title="Приглашения"
        description="Бренды могут приглашать вас напрямую. Примите, чтобы продолжить общение по заказу."
        eyebrow={
          <Link className="hover:text-foreground" href="/dashboard/deals">
            Назад к сделкам
          </Link>
        }
      />

      <DataList className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <DataListItem key={index} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-72" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-9 w-40" />
          </DataListItem>
        ))}
      </DataList>
    </Container>
  );
}
