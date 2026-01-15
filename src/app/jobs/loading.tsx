import { Container } from "@/components/ui/container";
import { ListSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Container className="py-10">
      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="md:w-80 space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-3/4" />
        </aside>
        <section className="flex-1 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-96" />
          </div>
          <ListSkeleton rows={6} />
        </section>
      </div>
    </Container>
  );
}
