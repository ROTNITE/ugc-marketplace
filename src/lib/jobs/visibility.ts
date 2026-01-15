import { prisma } from "@/lib/prisma";
import { Role, Prisma } from "@prisma/client";
import { notFound } from "next/navigation";

type Viewer = {
  userId: string;
  role: Role;
  brandProfileId?: string | null;
  creatorProfileId?: string | null;
} | null;

async function canCreatorView(
  jobId: string,
  creatorIds: string[],
  activeCreatorId: string | null,
) {
  if (activeCreatorId && creatorIds.includes(activeCreatorId)) return true;

  const [application, invitation] = await prisma.$transaction([
    prisma.application.findFirst({
      where: { jobId, creatorId: { in: creatorIds } },
      select: { id: true },
    }),
    prisma.invitation.findFirst({
      where: { jobId, creatorId: { in: creatorIds } },
      select: { id: true },
    }),
  ]);

  return Boolean(application || invitation);
}

type GetJobArgs<T extends Prisma.JobInclude | undefined> = {
  jobId: string;
  viewer: Viewer;
  include?: T;
};

export async function getJobForViewerOrThrow(
  args: { jobId: string; viewer: Viewer },
): Promise<Prisma.JobGetPayload<Prisma.JobDefaultArgs>>;
export async function getJobForViewerOrThrow<T extends Prisma.JobInclude>(
  args: GetJobArgs<T>,
): Promise<Prisma.JobGetPayload<{ include: T }>>;
export async function getJobForViewerOrThrow<T extends Prisma.JobInclude | undefined>({
  jobId,
  viewer,
  include,
}: GetJobArgs<T>): Promise<Prisma.JobGetPayload<{ include: T }>> {
  const job = (await prisma.job.findUnique({
    where: { id: jobId },
    include,
  })) as Prisma.JobGetPayload<{ include: T }> | null;

  if (!job) return notFound();

  const isPublicVisible = job.status === "PUBLISHED" && job.moderationStatus === "APPROVED";

  if (!viewer) {
    if (!isPublicVisible) return notFound();
    return job;
  }

  if (viewer.role === "ADMIN") return job;

  if (viewer.role === "BRAND") {
    const brandIds = [viewer.userId, viewer.brandProfileId].filter(Boolean) as string[];
    if (!brandIds.includes(job.brandId)) return notFound();
    return job;
  }

  if (viewer.role === "CREATOR") {
    if (isPublicVisible) return job;
    const creatorIds = [viewer.userId, viewer.creatorProfileId].filter(Boolean) as string[];
    const hasAccess = await canCreatorView(job.id, creatorIds, job.activeCreatorId);
    if (!hasAccess) return notFound();
    return job;
  }

  return notFound();
}
