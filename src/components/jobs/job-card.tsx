import Link from "next/link";
import type { Job } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_LABELS, NICHE_LABELS, RIGHTS_PACKAGE_LABELS, CURRENCY_LABELS } from "@/lib/constants";
import { format } from "date-fns";

export type JobListItem = Pick<
  Job,
  | "id"
  | "title"
  | "description"
  | "platform"
  | "niche"
  | "rightsPackage"
  | "budgetMin"
  | "budgetMax"
  | "currency"
  | "deadlineDate"
  | "deliverablesCount"
>;

export function JobCard({ job }: { job: JobListItem }) {
  return (
    <Link href={`/jobs/${job.id}`} className="block">
      <Card className="hover:border-border hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="soft">{PLATFORM_LABELS[job.platform]}</Badge>
            <Badge variant="soft">{NICHE_LABELS[job.niche]}</Badge>
            <Badge variant="soft">{RIGHTS_PACKAGE_LABELS[job.rightsPackage]}</Badge>
          </div>
          <CardTitle className="mt-2">{job.title}</CardTitle>
          {job.description ? (
            <CardDescription className="max-h-12 overflow-hidden">{job.description}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground flex flex-wrap gap-4">
          <div>
            Бюджет:{" "}
            <span className="text-foreground font-medium">
              {job.budgetMin}–{job.budgetMax} {CURRENCY_LABELS[job.currency]}
            </span>
          </div>
          <div>
            Дедлайн:{" "}
            <span className="text-foreground font-medium">
              {job.deadlineDate ? format(job.deadlineDate, "dd.MM.yyyy") : "не указан"}
            </span>
          </div>
          <div>
            Кол-во:{" "}
            <span className="text-foreground font-medium">{job.deliverablesCount} видео</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
