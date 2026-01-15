"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Platform, Niche, Currency } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { getVerificationStatusBadge } from "@/lib/status-badges";
import {
  PLATFORMS,
  PLATFORM_LABELS,
  NICHES,
  NICHE_LABELS,
  CURRENCIES,
  CURRENCY_LABELS,
} from "@/lib/constants";

const LANG_OPTIONS = ["ru", "uk", "en"] as const;
const MAX_PORTFOLIO = 10;

type CreatorProfileFormValues = {
  displayName: string;
  bio: string;
  languages: string[];
  platforms: Platform[];
  niches: Niche[];
  pricePerVideo: number | null;
  currency: Currency;
  portfolioLinks: string[];
  isPublic: boolean;
  verificationCode: string | null;
  verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
  verifiedAt: string | Date | null;
  verificationReason: string | null;
  verificationReviewedAt: string | Date | null;
};

type CreatorProfileFormProps = {
  initialProfile: CreatorProfileFormValues;
};

export function CreatorProfileForm({ initialProfile }: CreatorProfileFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialProfile.displayName);
  const [bio, setBio] = useState(initialProfile.bio);
  const [languages, setLanguages] = useState<string[]>(initialProfile.languages);
  const [platforms, setPlatforms] = useState<Platform[]>(initialProfile.platforms);
  const [niches, setNiches] = useState<Niche[]>(initialProfile.niches);
  const [pricePerVideo, setPricePerVideo] = useState(
    initialProfile.pricePerVideo ? String(initialProfile.pricePerVideo) : "",
  );
  const [currency, setCurrency] = useState<Currency>(initialProfile.currency);
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>(initialProfile.portfolioLinks);
  const [newLink, setNewLink] = useState("");
  const [isPublic, setIsPublic] = useState(initialProfile.isPublic);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [verificationCode, setVerificationCode] = useState<string | null>(initialProfile.verificationCode);
  const [verificationStatus, setVerificationStatus] = useState(initialProfile.verificationStatus);
  const [verificationReason] = useState<string | null>(initialProfile.verificationReason);
  const [verificationReviewedAt] = useState<string | Date | null>(initialProfile.verificationReviewedAt);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const verificationBadge =
    verificationStatus !== "UNVERIFIED" ? getVerificationStatusBadge(verificationStatus) : null;

  const toggleValue = <T,>(list: T[], value: T, setter: (next: T[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  function addPortfolioLink() {
    const normalized = newLink.trim();
    if (!normalized) return;
    if (portfolioLinks.includes(normalized)) {
      setError("Эта ссылка уже добавлена.");
      return;
    }
    if (portfolioLinks.length >= MAX_PORTFOLIO) {
      setError("Можно добавить не больше 10 ссылок.");
      return;
    }
    setPortfolioLinks((prev) => [...prev, normalized]);
    setNewLink("");
    setError(null);
  }

  async function saveProfile() {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    const payload = {
      displayName,
      bio,
      languages,
      platforms,
      niches,
      pricePerVideo: pricePerVideo ? Number(pricePerVideo) : undefined,
      currency,
      portfolioLinks,
      isPublic,
    };

    try {
      const res = await fetch("/api/creator/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.ok === false) {
        setError(data?.error?.message ?? "Не удалось сохранить профиль.");
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError("Не удалось сохранить профиль.");
    } finally {
      setIsSaving(false);
    }
  }

  async function generateCode() {
    setIsVerifying(true);
    setVerificationError(null);
    setVerificationMessage(null);
    try {
      const res = await fetch("/api/creator/verification/generate", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.ok === false) {
        setVerificationError(data?.error?.message ?? "Не удалось сгенерировать код.");
        return;
      }
      const payload = data?.data ?? data;
      setVerificationCode(payload?.code ?? null);
      setVerificationStatus(payload?.status ?? "UNVERIFIED");
      setVerificationMessage("Код сгенерирован. Добавьте его в bio и отправьте на проверку.");
    } catch {
      setVerificationError("Не удалось сгенерировать код.");
    } finally {
      setIsVerifying(false);
    }
  }

  async function submitVerification() {
    setIsVerifying(true);
    setVerificationError(null);
    setVerificationMessage(null);
    try {
      const res = await fetch("/api/creator/verification/submit", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.ok === false) {
        setVerificationError(data?.error?.message ?? "Не удалось отправить на проверку.");
        return;
      }
      setVerificationStatus("PENDING");
      setVerificationMessage("Профиль отправлен на проверку.");
    } catch {
      setVerificationError("Не удалось отправить на проверку.");
    } finally {
      setIsVerifying(false);
    }
  }

  async function requestReverification() {
    setIsVerifying(true);
    setVerificationError(null);
    setVerificationMessage(null);
    try {
      const res = await fetch("/api/creator/verification/request", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.ok === false) {
        setVerificationError(data?.error?.message ?? "Не удалось отправить на повторную проверку.");
        return;
      }
      setVerificationStatus("PENDING");
      setVerificationMessage("Заявка отправлена. Мы уведомим, когда профиль проверят.");
    } catch {
      setVerificationError("Не удалось отправить на повторную проверку.");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="warning" title="Ошибка сохранения">
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert variant="success" title="Профиль обновлен">
          Данные сохранены и готовы для брендов.
        </Alert>
      ) : null}

      <div id="creator-display-name" className="space-y-2 scroll-mt-24">
        <label className="text-sm font-medium">Отображаемое имя</label>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Например, Демо креатор"
        />
      </div>

      <div id="creator-bio" className="space-y-2 scroll-mt-24">
        <label className="text-sm font-medium">О себе</label>
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Коротко о вашем опыте и стиле контента"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <div className="text-sm font-medium">Языки</div>
          <div className="space-y-2 text-sm text-muted-foreground">
            {LANG_OPTIONS.map((lang) => (
              <label key={lang} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={languages.includes(lang)}
                  onChange={() => toggleValue(languages, lang, setLanguages)}
                />
                {lang}
              </label>
            ))}
          </div>
        </div>

        <div id="creator-platforms" className="space-y-2 scroll-mt-24">
          <div className="text-sm font-medium">Платформы</div>
          <div className="space-y-2 text-sm text-muted-foreground">
            {PLATFORMS.map((platform) => (
              <label key={platform} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={platforms.includes(platform)}
                  onChange={() => toggleValue(platforms, platform, setPlatforms)}
                />
                {PLATFORM_LABELS[platform]}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Ниши</div>
          <div className="space-y-2 text-sm text-muted-foreground">
            {NICHES.map((niche) => (
              <label key={niche} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={niches.includes(niche)}
                  onChange={() => toggleValue(niches, niche, setNiches)}
                />
                {NICHE_LABELS[niche]}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div id="creator-price" className="space-y-2 scroll-mt-24">
          <label className="text-sm font-medium">Цена за видео</label>
          <Input
            inputMode="numeric"
            value={pricePerVideo}
            onChange={(e) => setPricePerVideo(e.target.value)}
            placeholder="Например, 1500"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Валюта</label>
          <Select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {CURRENCY_LABELS[c]}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">Эта валюта будет использоваться для выплат и баланса.</p>
        </div>
      </div>

      <div id="creator-portfolio" className="space-y-3 scroll-mt-24">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Ссылки на портфолио</label>
          <span className="text-xs text-muted-foreground">
            {portfolioLinks.length}/{MAX_PORTFOLIO}
          </span>
        </div>
        <div className="flex gap-2">
          <Input value={newLink} onChange={(e) => setNewLink(e.target.value)} placeholder="https://..." />
          <Button type="button" variant="outline" onClick={addPortfolioLink}>
            Добавить
          </Button>
        </div>
        {portfolioLinks.length ? (
          <div className="space-y-2">
            {portfolioLinks.map((link) => (
              <div
                key={link}
                className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm"
              >
                <span className="truncate">{link}</span>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setPortfolioLinks((prev) => prev.filter((item) => item !== link))}
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Добавьте 1-2 ссылки на примеры работ.</p>
        )}
      </div>

      <div className="rounded-lg border border-border/60 bg-card p-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Публичный профиль</h3>
            <p className="text-xs text-muted-foreground">Разрешите показывать вас в каталоге креаторов для брендов.</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-primary"
              checked={isPublic}
              onChange={() => setIsPublic((prev) => !prev)}
            />
            Показывать в каталоге
          </label>
        </div>
        {!isPublic ? (
          <Alert variant="info" title="Профиль скрыт">
            Бренды не увидят ваш профиль в каталоге, пока вы не включите доступ.
          </Alert>
        ) : null}
      </div>

      <Button onClick={saveProfile} disabled={isSaving}>
        {isSaving ? "Сохранение..." : "Сохранить"}
      </Button>

      <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Верификация</h3>
            <p className="text-xs text-muted-foreground">
              Подтвердите профиль, чтобы бренды доверяли вашему аккаунту.
            </p>
          </div>
          {verificationBadge ? (
            <Badge variant={verificationBadge.variant} tone={verificationBadge.tone}>
              {verificationBadge.label}
            </Badge>
          ) : null}
        </div>

        {verificationError ? (
          <Alert variant="warning" title="Ошибка">
            {verificationError}
          </Alert>
        ) : null}

        {verificationMessage ? (
          <Alert variant="info" title="Готово">
            {verificationMessage}
          </Alert>
        ) : null}

        {verificationStatus === "VERIFIED" ? (
          <Alert variant="success" title="Профиль подтверждён">
            {verificationReviewedAt ? (
              <p className="text-sm text-muted-foreground">
                Подтверждён: {new Date(verificationReviewedAt).toLocaleString()}
              </p>
            ) : null}
          </Alert>
        ) : null}

        {verificationStatus === "REJECTED" ? (
          <div className="space-y-3">
            <Alert variant="warning" title="Верификация отклонена">
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>{verificationReason ?? "Модератор попросил доработать профиль."}</p>
                {verificationReviewedAt ? (
                  <p>Рассмотрено: {new Date(verificationReviewedAt).toLocaleString()}</p>
                ) : null}
              </div>
            </Alert>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Обновите био, платформы или ссылки и отправьте на повторную проверку.</p>
              <Button type="button" onClick={requestReverification} disabled={isVerifying}>
                Отправить на повторную проверку
              </Button>
            </div>
          </div>
        ) : null}

        {verificationStatus === "UNVERIFIED" ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>1) Сгенерируйте код и добавьте его в bio/описание профиля TikTok/IG.</p>
            <p>2) Нажмите {"<"}Отправить на проверку{">"}.</p>
            {verificationCode ? (
              <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                Код: <span className="font-medium text-foreground">{verificationCode}</span>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={generateCode} disabled={isVerifying}>
                Сгенерировать код
              </Button>
              <Button type="button" onClick={submitVerification} disabled={isVerifying || !verificationCode}>
                Отправить на проверку
              </Button>
            </div>
          </div>
        ) : null}

        {verificationStatus === "PENDING" ? (
          <Alert variant="info" title="На проверке">
            Мы проверим ваш профиль вручную и обновим статус.
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
