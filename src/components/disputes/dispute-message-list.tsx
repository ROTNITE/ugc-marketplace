import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Role } from "@prisma/client";

type MessageItem = {
  id: string;
  kind: string;
  text: string | null;
  links: unknown;
  createdAt: Date;
  authorRole: Role;
  authorUserId: string;
  authorUser?: { id: string; name: string | null } | null;
};

type Props = {
  messages: MessageItem[];
  viewerId?: string | null;
};

const KIND_LABELS: Record<string, string> = {
  MESSAGE: "Сообщение",
  EVIDENCE_LINK: "Доказательства",
  ADMIN_NOTE: "Комментарий админа",
};

function roleLabel(role?: Role | null) {
  if (role === "ADMIN") return "Админ";
  if (role === "BRAND") return "Бренд";
  if (role === "CREATOR") return "Креатор";
  return "Пользователь";
}

export function DisputeMessageList({ messages, viewerId }: Props) {
  if (messages.length === 0) {
    return <p className="text-sm text-muted-foreground">Сообщений пока нет.</p>;
  }

  return (
    <div className="space-y-3">
      {messages.map((message) => {
        const isMine = viewerId && message.authorUserId === viewerId;
        const authorName = message.authorUser?.name?.trim() || roleLabel(message.authorRole);
        const title = isMine ? "Вы" : authorName;
        const time = format(new Date(message.createdAt), "dd.MM.yyyy HH:mm", { locale: ru });
        const links = Array.isArray(message.links) ? (message.links as string[]) : [];

        return (
          <Card key={message.id} className="p-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{title}</span>
              <Badge variant="soft">{roleLabel(message.authorRole)}</Badge>
              <Badge variant="soft">{KIND_LABELS[message.kind] ?? message.kind}</Badge>
              <span>{time}</span>
            </div>
            {message.text ? <p className="mt-2 whitespace-pre-wrap text-sm">{message.text}</p> : null}
            {links.length > 0 ? (
              <div className="mt-2 space-y-1 text-sm">
                {links.map((link, index) => (
                  <a
                    key={`${link}-${index}`}
                    className="block text-primary hover:underline break-all"
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {link}
                  </a>
                ))}
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
