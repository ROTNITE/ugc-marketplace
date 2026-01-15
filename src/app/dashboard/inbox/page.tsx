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
import { buildUpdatedAtCursorWhere, decodeCursor, parseCursor, parseLimit, sliceWithNextCursor } from "@/lib/pagination";

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

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) {
    return (
      <Container size="sm" className="py-10">
        <Alert variant="info" title="Нужен вход">
          Перейдите на страницу входа.
        </Alert>
      </Container>
    );
  }

  if (user.role === "ADMIN") {
    return (
      <Container size="sm" className="py-10">
        <Alert variant="warning" title="Недоступно">
          Раздел сообщений предназначен для брендов и креаторов.{" "}
          <Link className="text-primary hover:underline" href="/admin">
            Перейти в админку
          </Link>
        </Alert>
      </Container>
    );
  }

  const limit = parseLimit(searchParams);
  const cursor = decodeCursor<{ updatedAt: string; id: string }>(parseCursor(searchParams));
  const cursorWhere = buildUpdatedAtCursorWhere(cursor);
  const where = {
    participants: { some: { userId: user.id } },
    ...(cursorWhere ? { AND: [cursorWhere] } : {}),
  };

  const result = await prisma.conversation.findMany({
    where,
    include: {
      participants: { include: { user: { include: { brandProfile: true } } } },
      job: { select: { id: true, title: true, status: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const paged = sliceWithNextCursor(result, limit, (conversation) => ({
    id: conversation.id,
    updatedAt: conversation.updatedAt.toISOString(),
  }));
  const conversations = paged.items;
  const nextCursor = paged.nextCursor;

  const missingParticipants = conversations
    .filter((conversation) => !conversation.participants.some((participant) => participant.userId === user.id))
    .map((conversation) => ({ conversationId: conversation.id, userId: user.id }));

  if (missingParticipants.length > 0) {
    await prisma.conversationParticipant.createMany({ data: missingParticipants, skipDuplicates: true });
  }

  const unreadFilters = conversations
    .map((conversation) => {
      const participant = conversation.participants.find((item) => item.userId === user.id);
      const lastReadAt = participant?.lastReadAt ?? null;
      return lastReadAt
        ? { conversationId: conversation.id, createdAt: { gt: lastReadAt } }
        : { conversationId: conversation.id };
    });

  const unreadCounts = unreadFilters.length
    ? await prisma.message.groupBy({
        by: ["conversationId"],
        where: { OR: unreadFilters },
        _count: { _all: true },
      })
    : [];

  const unreadByConversation = new Map(
    unreadCounts.map((item) => [item.conversationId, item._count._all]),
  );

  const isBrand = user.role === "BRAND";
  const hasClearable = conversations.some(
    (conversation) => conversation.job && ["COMPLETED", "CANCELED"].includes(conversation.job.status),
  );

  const nextParams = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => nextParams.append(key, item));
      return;
    }
    if (value !== undefined) {
      nextParams.set(key, value);
    }
  });
  if (nextCursor) {
    nextParams.set("cursor", nextCursor);
    nextParams.set("limit", String(limit));
  }

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
        <>
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
          {nextCursor ? (
            <div>
              <Link href={`/dashboard/inbox?${nextParams.toString()}`}>
                <Button variant="outline">Показать еще</Button>
              </Link>
            </div>
          ) : null}
        </>
      )}
    </Container>
  );
}
