import { Container } from "@/components/ui/container";
import { ListSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Container className="py-10 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-60" />
      </div>
      <ListSkeleton rows={7} />
    </Container>
  );
}
