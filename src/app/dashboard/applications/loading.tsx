import Link from "next/link";
import { Container } from "@/components/ui/container";
import { DataList, DataListItem } from "@/components/ui/data-list";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ApplicationsLoading() {
  return (
    <Container className="py-10 space-y-6">
      <PageHeader
        title="Мои отклики"
        description="Все заявки, которые вы отправили брендам."
        eyebrow={
          <Link className="hover:text-foreground" href="/dashboard/deals">
            Назад к сделкам
          </Link>
        }
      />

      <DataList className="space-y-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <DataListItem key={index} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-3 w-44" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-28 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-3 w-72" />
            </div>
            <Skeleton className="h-8 w-28" />
          </DataListItem>
        ))}
      </DataList>
    </Container>
  );
}
