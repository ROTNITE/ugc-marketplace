import { getServerSession } from "next-auth/next";
import { format } from "date-fns";
import { Role } from "@prisma/client";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { MessageComposer } from "@/components/inbox/message-composer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { getRoleBadge, getVerificationStatusBadge } from "@/lib/status-badges";

export const dynamic = "force-dynamic";

type Counterparty = {
  brandProfile?: { id?: string; companyName: string } | null;
  name?: string | null;
  role?: Role | null;
  creatorProfile?: { id: string; verificationStatus: string } | null;
};

function getRoleLabel(role?: Role | null) {
  if (role === "BRAND") return "Бренд";
  if (role === "CREATOR") return "Креатор";
  if (role === "ADMIN") return "Админ";
  return "Пользователь";
}

function getDisplayName(user: Counterparty | undefined) {
  if (!user) return "Диалог";
  if (user.role === "BRAND" && user.brandProfile?.companyName) return user.brandProfile.companyName;
  if (user.name) return user.name;
  return getRoleLabel(user.role);
}

export default async function InboxConversationPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="info" title="Нужен вход">
          Перейдите на страницу входа.
        </Alert>
      </div>
    );
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      participants: {
        include: {
          user: {
            include: {
              brandProfile: true,
              creatorProfile: { select: { id: true, verificationStatus: true } },
            },
          },
        },
      },
      job: { select: { id: true, title: true } },
    },
  });

  if (!conversation) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="info" title="Диалог не найден">
          Проверьте ссылку или вернитесь в список сообщений.
        </Alert>
      </div>
    );
  }

  const isParticipant = conversation.participants.some((p) => p.userId === user.id);
  if (!isParticipant) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="warning" title="Недоступно">
          Этот диалог доступен только участникам.
        </Alert>
      </div>
    );
  }

  await prisma.conversationParticipant.upsert({
    where: { conversationId_userId: { conversationId: conversation.id, userId: user.id } },
    update: { lastReadAt: new Date() },
    create: { conversationId: conversation.id, userId: user.id, lastReadAt: new Date() },
  });

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      isRead: false,
      href: `/dashboard/inbox/${conversation.id}`,
    },
    data: { isRead: true },
  });

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          role: true,
          brandProfile: { select: { id: true, companyName: true } },
          creatorProfile: { select: { id: true, verificationStatus: true } },
        },
      },
    },
  });

  const orderedMessages = [...messages].reverse();
  const counterparty = conversation.participants.find((p) => p.userId !== user.id)?.user;
  const profileLink =
    counterparty?.role === "CREATOR" && counterparty.creatorProfile
      ? `/creators/${counterparty.creatorProfile.id}`
      : counterparty?.role === "BRAND" && counterparty.brandProfile
        ? `/brands/${counterparty.brandProfile.id}`
        : counterparty?.role === "ADMIN"
          ? "/admin"
          : null;
  const roleBadge = getRoleBadge(counterparty?.role);
  const verificationBadge =
    counterparty?.role === "CREATOR" && counterparty.creatorProfile?.verificationStatus === "VERIFIED"
      ? getVerificationStatusBadge(counterparty.creatorProfile.verificationStatus)
      : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <PageHeader
        title={getDisplayName(counterparty)}
        description="Собеседник"
        eyebrow={
          <Link className="hover:text-foreground" href="/dashboard/inbox">
            Назад к диалогам
          </Link>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={roleBadge.variant} tone={roleBadge.tone}>
              {roleBadge.label}
            </Badge>
            {verificationBadge ? (
              <Badge variant={verificationBadge.variant} tone={verificationBadge.tone}>
                {verificationBadge.label}
              </Badge>
            ) : null}
            {profileLink ? (
              <Link href={profileLink}>
                <Button size="sm" variant="outline">
                  Открыть профиль
                </Button>
              </Link>
            ) : null}
          </div>
        }
      />

      {conversation.job ? (
        <SectionCard title="Контекст" description="Связанный заказ">
          <p className="text-sm text-muted-foreground">
            Заказ:{" "}
            <Link className="text-primary hover:underline" href={`/jobs/${conversation.job.id}`}>
              {conversation.job.title}
            </Link>
          </p>
        </SectionCard>
      ) : null}

      {orderedMessages.length === 0 ? (
        <EmptyState
          title="Сообщений пока нет"
          description="Напишите первым, чтобы начать диалог."
        />
      ) : (
        <div className="space-y-3">
          {orderedMessages.map((message, index) => {
            const isMine = message.senderId === user.id;
            const time = format(new Date(message.createdAt), "HH:mm");
            const prev = index > 0 ? orderedMessages[index - 1] : null;
            const showHeader = !prev || prev.senderId !== message.senderId;
            const senderLabel = isMine ? "Вы" : getDisplayName(message.sender);
            const senderBadge = getRoleBadge(message.sender?.role);

            return (
              <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] space-y-1 ${isMine ? "text-right" : "text-left"}`}>
                  {showHeader ? (
                    <div className={`flex items-center gap-2 text-xs text-muted-foreground ${isMine ? "justify-end" : "justify-start"}`}>
                      <span className="font-medium text-foreground">{senderLabel}</span>
                      <Badge variant={senderBadge.variant} tone={senderBadge.tone}>
                        {senderBadge.label}
                      </Badge>
                    </div>
                  ) : null}
                  <div
                    className={`rounded-lg px-3 py-2 text-sm shadow-sm ${
                      isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    <div
                      className={`mt-1 text-[11px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                    >
                      {time}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-border/60 pt-4">
        <MessageComposer conversationId={conversation.id} />
      </div>
    </div>
  );
}
