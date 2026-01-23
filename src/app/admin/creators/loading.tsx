import { Container } from "@/components/ui/container";
import { DataList, DataListItem } from "@/components/ui/data-list";
import { PageToolbar, PageToolbarDescription, PageToolbarTitle } from "@/components/ui/page-toolbar";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminCreatorsLoading() {
  return (
    <Container className="py-10 space-y-6">
      <PageToolbar className="border-0 pb-0">
        <div className="space-y-1">
          <PageToolbarTitle>Верификация креаторов</PageToolbarTitle>
          <PageToolbarDescription>Проверка кодов и профилей.</PageToolbarDescription>
        </div>
      </PageToolbar>

      <div className="rounded-lg border border-border-soft bg-card p-4 space-y-3">
        <div>
          <div className="text-base font-semibold">Фильтры</div>
          <p className="text-sm text-muted-foreground">Статус верификации</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-24 rounded-md" />
          ))}
        </div>
      </div>

      <DataList className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <DataListItem key={index} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-3 w-56" />
              <Skeleton className="h-3 w-72" />
            </div>
            <Skeleton className="h-9 w-40" />
          </DataListItem>
        ))}
      </DataList>
    </Container>
  );
}
