import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok } from "@/lib/api/contract";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/outbox";
import { createNotification } from "@/lib/notifications";
import { isBrandOwner } from "@/lib/authz";
import { logApiError } from "@/lib/request-id";

export async function POST(
  _req: Request,
  { params }: { params: { id: string; applicationId: string } },
) {
  const requestId = ensureRequestId(_req);

  try {
    const user = await requireRole("BRAND");
    const job = await prisma.job.findUnique({
      where: { id: params.id },
      select: { id: true, brandId: true, status: true, title: true, budgetMax: true, currency: true },
    });

    if (!job) return fail(404, API_ERROR_CODES.NOT_FOUND, "Заказ не найден.", requestId);
    if (!isBrandOwner(user, job.brandId)) {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Заказ не найден.", requestId);
    }
    if (job.status === "CLOSED") {
      return fail(
        409,
        API_ERROR_CODES.CONFLICT,
        "Заказ закрыт и не может быть принят.",
        requestId,
        { code: "JOB_CLOSED" },
      );
    }

    const application = await prisma.application.findUnique({
      where: { id: params.applicationId },
      select: { id: true, jobId: true, creatorId: true, status: true, priceQuote: true },
    });

    if (!application || application.jobId !== job.id) {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Отклик не найден.", requestId);
    }

    if (application.status !== "PENDING") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Отклик уже обработан.", requestId, {
        code: "APPLICATION_NOT_PENDING",
      });
    }

    const amountBase = application.priceQuote ?? job.budgetMax;
    const amountCents = Math.max(0, amountBase) * 100;

    const result = await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: application.id },
        data: { status: "ACCEPTED" },
      });

      await tx.job.update({
        where: { id: job.id },
        data: { status: "PAUSED", activeCreatorId: application.creatorId },
      });

      await tx.application.updateMany({
        where: { jobId: job.id, status: "PENDING", NOT: { id: application.id } },
        data: { status: "REJECTED" },
      });

      await tx.escrow.upsert({
        where: { jobId: job.id },
        update: { creatorId: application.creatorId },
        create: {
          jobId: job.id,
          brandId: job.brandId,
          creatorId: application.creatorId,
          amountCents,
          currency: job.currency,
          status: "UNFUNDED",
        },
      });

      const existingConversation = await tx.conversation.findFirst({
        where: {
          jobId: job.id,
          AND: [
            { participants: { some: { userId: user.id } } },
            { participants: { some: { userId: application.creatorId } } },
          ],
        },
        select: { id: true },
      });

      if (existingConversation) {
        return { conversationId: existingConversation.id };
      }

      const conversation = await tx.conversation.create({
        data: {
          jobId: job.id,
          participants: {
            create: [{ userId: user.id }, { userId: application.creatorId }],
          },
        },
        select: { id: true },
      });

      return { conversationId: conversation.id };
    });

    await emitEvent("APPLICATION_ACCEPTED", {
      jobId: job.id,
      creatorId: application.creatorId,
      applicationId: application.id,
      conversationId: result.conversationId,
    });

    await createNotification(application.creatorId, {
      type: "APPLICATION_ACCEPTED",
      title: "Вас приняли в заказ",
      body: job.title,
      href: `/dashboard/inbox/${result.conversationId}`,
    });

    return ok({ conversationId: result.conversationId }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/jobs/[id]/applications/[applicationId]/accept failed", error, requestId, {
      jobId: params.id,
      applicationId: params.applicationId,
    });
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось принять отклик.", requestId);
  }
}
