# UI Audit

## Область и метод
- Основа аудита: просмотр кода `src/app`, `src/components`, `src/lib/status-badges.ts`, `docs/ARCHITECTURE.md`, `CONCEPT.md`.
- Ручной прогон UI в браузере не выполнялся (аудит кода без скриншотов).

## Публичные страницы
- `/` — лендинг для гостя, для авторизованных — роль‑ориентированные home‑экраны (CreatorHome/BrandHome/AdminHome).
- `/login`, `/register` — формы входа/регистрации с выбором роли.
- `/jobs` — лента заказов с фильтрами и карточками JobCard, пустые состояния и алерты.
- `/jobs/[id]` — детальная карточка заказа: описание, требования, бейджи, форма отклика и действия бренда.
- `/creators` — каталог креаторов с фильтрами, карточками, бейджами верификации.
- `/creators/[id]` — публичный профиль креатора + приглашение от бренда.
- `/brands/[id]` — публичный профиль бренда, рейтинг и отзывы.

## Кабинет Brand
- `/dashboard` — обзорные карточки навигации.
- `/dashboard/jobs` — управление заказами (вкладки по статусам, действия: редактировать, дублировать, пауза, отклики, приемка).
- `/dashboard/jobs/new`, `/dashboard/jobs/[id]/edit` — мастер создания/редактирования заказа (stepper).
- `/dashboard/jobs/[id]/applications` — список откликов, действия принять/отклонить, переход в чат.
- `/dashboard/jobs/[id]/review` — приемка: эскроу, сдачи, approve/request changes, споры, отмена.
- `/dashboard/deals` — сводка сделок (модерация, отклики, в работе, приемка, завершено).
- `/dashboard/inbox`, `/dashboard/inbox/[id]` — список диалогов и чат.
- `/dashboard/profile` — профиль бренда + Telegram‑биндинг.
- `/dashboard/reviews` — отзывы бренда (оставить и просмотреть).
- `/dashboard/notifications` — центр уведомлений с фильтрами.

## Кабинет Creator
- `/dashboard` — обзорные карточки навигации.
- `/dashboard/deals` — сделки креатора (приглашения, отклики, в работе, на проверке/правки, завершено).
- `/dashboard/invitations` — приглашения от брендов.
- `/dashboard/applications` — мои отклики.
- `/dashboard/work` — редирект на `/dashboard/deals?tab=work` (алиас).
- `/dashboard/work/[id]` — страница работы: сдача материалов, статус эскроу, история версий, споры.
- `/dashboard/balance` — кошелек, история операций, заявки на выплату.
- `/dashboard/alerts` — сохраненные алерты для ленты заказов.
- `/dashboard/profile` — профиль креатора + верификация + Telegram‑биндинг.
- `/dashboard/reviews`, `/dashboard/notifications`, `/dashboard/inbox` — общие для обеих ролей.

## Админ‑панель
- `/admin` — обзор очередей и ключевых метрик.
- `/admin/jobs` — модерация заказов (approve/reject).
- `/admin/creators` — верификация креаторов.
- `/admin/disputes`, `/admin/disputes/[id]` — споры.
- `/admin/payouts` — заявки на выплаты.
- `/admin/finance` — кошельки, эскроу, корректировки.
- `/admin/events` — outbox события.
- `/admin/settings` — настройки комиссии и валюты.

## UI‑компоненты (src/components/ui)
- Alert, Badge, Button, Card, Container, EmptyState, Input, PageHeader, SectionCard, Select, Stat, Stepper, Textarea.
- Примитивы используются выборочно; есть страницы, где заголовки и карточки собраны вручную.

## Повторяемые блоки вне ui
- Навигация: `SiteHeader`, `SiteFooter`.
- Лендинг: `landing/*` (hero, features, how‑it‑works, safety, cta).
- Home‑экраны: `home/*` (role dashboards).
- Заказы: `jobs/*` (JobCard, JobFilters, JobApplyForm, JobActions, JobResubmitButton).
- Отклики/приглашения: `applications/*`, `invitations/*`.
- Чат: `inbox/*` (composer, delete, clear).
- Платежи: `escrow/*`, `payouts/*`.
- Профили: `creator/profile-form`, `brand/profile-form`, `telegram/telegram-binding-card`.
- Споры: `disputes/*`.
- Работы: `work/*` (submission form, review actions).

## Статусы и локализация
- Есть общий справочник: `src/lib/status-badges.ts` (job/moderation/application/submission/escrow/payout/dispute).
- Не везде используется единый справочник: часть страниц все еще показывает сырой enum или локальные маппинги.
- Встречаются англоязычные строки в UI (например, “Brand/Creator/Admin”, “VERIFIED”, “Brand name”) — требуется полная локализация.

## Проблемы консистентности и UX
- Пустые состояния не унифицированы: где-то `Alert`, где-то `EmptyState`, где-то просто текст.
- Смешанные контейнеры и заголовки: часть страниц использует `PageHeader/SectionCard`, часть — ручные `mx-auto/max-w-*`.
- Статусы отображаются в разных форматах (raw enum vs локализованные лейблы).
- Смешение терминологии (Brand/Creator/Inbox/VERIFIED) рядом с русским UI.
- Недостаточно процессных состояний: нет skeleton/loader для списков.
- CTA‑паттерны отличаются между экранами (кнопка vs текстовая ссылка для схожих действий).
- Онбординг нового пользователя не явный; мало подсказок “что делать дальше”.

## Мобильная навигация (обновления)
- Добавлено hamburger?меню для public/dashboard/admin (SiteHeader, DashboardShell, AdminShell).
- Десктопные пункты скрываются на mobile (md:hidden), навигация доступна через раскрывающуюся панель.
- Нужна ручная проверка на 360?430px: доступ к ключевым разделам без переполнения.

## Выводы и приоритеты улучшений
1) Полная унификация статусов через `status-badges.ts` и локализация всех лейблов.  
2) Единый паттерн пустых/ошибочных состояний + базовые лоадеры.  
3) Унифицированные заголовки и контейнеры (`PageHeader/SectionCard/Container`) во всех разделах.  
4) Навигация и терминология: убрать англ. слова, унифицировать названия ролей и разделов.  
5) UX‑подсказки в ключевых флоу (модерация, эскроу, приёмка, выплаты).

## Что нужно для ручного прогона
- Локальный запуск с демо‑аккаунтами (Brand/Creator/Admin).
- Скриншоты ключевых экранов: лендинг, jobs list/detail, creators/brands public, dashboard (jobs/deals/inbox/work/balance/profile/notifications), admin (jobs/creators/disputes/payouts/settings/finance/events).
