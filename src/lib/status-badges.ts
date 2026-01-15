import type { BadgeTone, BadgeVariant } from "@/components/ui/badge";

export type BadgeStyle = {
  label: string;
  tone?: BadgeTone;
  variant?: BadgeVariant;
};

const soft = (label: string, tone: BadgeTone = "neutral"): BadgeStyle => ({
  label,
  tone,
  variant: "soft",
});

const solid = (label: string, tone: BadgeTone): BadgeStyle => ({
  label,
  tone,
  variant: "default",
});

export function getRoleBadge(role: string | null | undefined): BadgeStyle {
  if (role === "BRAND") return soft("Бренд", "primary");
  if (role === "CREATOR") return soft("Креатор", "info");
  if (role === "ADMIN") return soft("Админ", "neutral");
  return soft("Пользователь", "neutral");
}

export function getJobStatusBadge(
  status: string,
  options?: { activeCreatorId?: string | null },
): BadgeStyle {
  switch (status) {
    case "DRAFT":
      return soft("Черновик", "neutral");
    case "PUBLISHED":
      return soft("Опубликован", "info");
    case "PAUSED":
      if (options && "activeCreatorId" in options && !options.activeCreatorId) {
        return soft("На паузе", "warning");
      }
      return soft("В работе", "warning");
    case "IN_REVIEW":
      return soft("На проверке", "warning");
    case "COMPLETED":
      return solid("Завершено", "success");
    case "CLOSED":
      return soft("Закрыт", "neutral");
    case "CANCELED":
      return soft("Отменено", "danger");
    default:
      return soft(status, "neutral");
  }
}

export function getModerationStatusBadge(status: string): BadgeStyle {
  switch (status) {
    case "PENDING":
      return soft("На модерации", "warning");
    case "APPROVED":
      return soft("Одобрен", "success");
    case "REJECTED":
      return soft("Отклонен", "danger");
    default:
      return soft(status, "neutral");
  }
}

export function getApplicationStatusBadge(status: string): BadgeStyle {
  switch (status) {
    case "PENDING":
      return soft("Ожидает", "warning");
    case "ACCEPTED":
      return soft("Принят", "success");
    case "REJECTED":
      return soft("Отклонен", "danger");
    case "WITHDRAWN":
      return soft("Отозван", "neutral");
    default:
      return soft(status, "neutral");
  }
}

export function getInvitationStatusBadge(status: string): BadgeStyle {
  switch (status) {
    case "SENT":
      return soft("Приглашение", "info");
    case "ACCEPTED":
      return soft("Принято", "success");
    case "DECLINED":
      return soft("Отклонено", "danger");
    default:
      return soft(status, "neutral");
  }
}

export function getSubmissionStatusBadge(status: string): BadgeStyle {
  switch (status) {
    case "SUBMITTED":
      return soft("На проверке", "warning");
    case "CHANGES_REQUESTED":
      return soft("Нужны правки", "warning");
    case "APPROVED":
      return soft("Принято", "success");
    default:
      return soft(status, "neutral");
  }
}

export function getPayoutStatusBadge(status: string): BadgeStyle {
  switch (status) {
    case "PENDING":
      return soft("На рассмотрении", "warning");
    case "APPROVED":
      return soft("Одобрено", "success");
    case "REJECTED":
      return soft("Отклонено", "danger");
    case "CANCELED":
      return soft("Отменено", "neutral");
    default:
      return soft(status, "neutral");
  }
}

export function getVerificationStatusBadge(status: string): BadgeStyle {
  switch (status) {
    case "UNVERIFIED":
      return soft("Не подтвержден", "neutral");
    case "PENDING":
      return soft("На проверке", "warning");
    case "REJECTED":
      return soft("Отклонено", "danger");
    case "VERIFIED":
      return soft("Проверено", "success");
    default:
      return soft(status, "neutral");
  }
}

export function getEscrowStatusBadge(status: string): BadgeStyle {
  switch (status) {
    case "UNFUNDED":
      return soft("Не пополнен", "warning");
    case "FUNDED":
      return soft("Пополнен", "info");
    case "RELEASED":
      return soft("Выплачен", "success");
    case "REFUNDED":
      return soft("Возвращён", "neutral");
    default:
      return soft(status, "neutral");
  }
}

export function getDisputeStatusBadge(status: string): BadgeStyle {
  switch (status) {
    case "OPEN":
      return soft("Открыт", "warning");
    case "RESOLVED":
      return soft("Решен", "success");
    case "CANCELED":
      return soft("Закрыт", "neutral");
    default:
      return soft(status, "neutral");
  }
}

export function getAlertStatusBadge(isActive: boolean): BadgeStyle {
  return isActive ? soft("Активен", "success") : soft("Выключен", "neutral");
}
