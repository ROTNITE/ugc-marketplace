import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConversationDeleteButton } from "@/components/inbox/conversation-delete-button";
import { ClearCompletedConversationsButton } from "@/components/inbox/clear-completed-conversations-button";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

type Counterparty = {
  brandProfile?: { companyName: string } | null;
  name?: string | null;
  email?: string | null;
};

function getDisplayName(user: Counterparty | undefined) {
  if (!user) return "Диалог";
  return user.brandProfile?.companyName || user.name || user.email || "Пользователь";
}

export default async function InboxPage() {
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

  if (user.role === "ADMIN") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="warning" title="Недоступно">
          Раздел сообщений предназначен для брендов и креаторов.{" "}
          <Link className="text-primary hover:underline" href="/admin">
            Перейти в админку
          </Link>
        </Alert>
      </div>
    );
  }

  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId: user.id } } },
    include: {
      participants: { include: { user: { include: { brandProfile: true } } } },
      job: { select: { id: true, title: true, status: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const missingParticipants = conversations
    .filter((conversation) => !conversation.participants.some((participant) => participant.userId === user.id))
    .map((conversation) => ({ conversationId: conversation.id, userId: user.id }));

  if (missingParticipants.length > 0) {
    await prisma.conversationParticipant.createMany({ data: missingParticipants, skipDuplicates: true });
  }

  const unreadCounts = await Promise.all(
    conversations.map(async (conversation) => {
      const participant = conversation.participants.find((item) => item.userId === user.id);
      const lastReadAt = participant?.lastReadAt ?? null;
      const count = await prisma.message.count({
        where: {
          conversationId: conversation.id,
          ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
        },
      });
      return [conversation.id, count] as const;
    }),
  );

  const unreadByConversation = new Map(unreadCounts);

  const isBrand = user.role === "BRAND";
  const hasClearable = conversations.some(
    (conversation) => conversation.job && ["COMPLETED", "CANCELED"].includes(conversation.job.status),
  );

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
        actions={hasClearable ? <ClearCompletedConversationsButton /> : null}
      />

      {conversations.length === 0 ? (
        <EmptyState
          title="Пока нет диалогов"
          description="Создайте первый диалог через отклик или прямое приглашение."
          action={
            isBrand ? (
              <Link className="text-primary hover:underline" href="/dashboard/jobs/new">
                Создать заказ
              </Link>
            ) : (
              <Link className="text-primary hover:underline" href="/jobs">
                Найти заказы
              </Link>
            )
          }
        />
      ) : (
        <div className="grid gap-4">
          {conversations.map((conversation) => {
            const counterparty = conversation.participants.find((p) => p.userId !== user.id)?.user;
            const lastMessage = conversation.messages[0];
            const lastMessageTime = lastMessage
              ? formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true, locale: ru })
              : null;
            const unreadCount = unreadByConversation.get(conversation.id) ?? 0;
            const isUnread = unreadCount > 0;

            return (
              <Card key={conversation.id} className={isUnread ? "border-primary/50 bg-primary/5" : undefined}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{getDisplayName(counterparty)}</CardTitle>
                      <CardDescription>
                        {conversation.job ? (
                          <>
                            Заказ:{" "}
                            <Link className="text-primary hover:underline" href={`/jobs/${conversation.job.id}`}>
                              {conversation.job.title}
                            </Link>
                          </>
                        ) : (
                          "Без привязки к заказу"
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {unreadCount > 0 ? (
                        <Badge variant="soft" className="rounded-full px-2 text-xs">
                          {unreadCount}
                        </Badge>
                      ) : null}
                      {lastMessageTime ? <span>{lastMessageTime}</span> : null}
                      {conversation.job && ["COMPLETED", "CANCELED"].includes(conversation.job.status) ? (
                        <ConversationDeleteButton conversationId={conversation.id} />
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3 text-sm">
                  <div className="text-muted-foreground flex-1">
                    {lastMessage ? lastMessage.body : "Нет сообщений."}
                  </div>
                  <Link href={`/dashboard/inbox/${conversation.id}`}>
                    <Button variant="outline" size="sm">
                      Открыть
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </Container>
  );
}
