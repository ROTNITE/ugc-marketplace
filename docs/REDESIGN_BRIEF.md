# Redesign Brief — UI Ground Truth + план редизайна

## 1) Текущая структура UI (карта директорий)
```
src/app/            # App Router (роуты + layouts + API)
src/components/     # UI и функциональные компоненты
  ui/               # примитивы (Button, Input, Card, ...)
  layout/           # PublicShell / DashboardShell / AdminShell
  landing/          # секции лендинга
  home/             # роль‑ориентированные home‑экраны
  jobs/, creators/, brand/, creator/, inbox/, payouts/, ...
src/app/globals.css # дизайн‑токены (CSS variables)
tailwind.config.ts  # маппинг токенов в Tailwind
```

## 2) Карта роутов (зоны)

### Публичная зона
- `/` (лендинг; для автологина — роль‑ориентированные Home)
- `/login`, `/register`
- `/jobs`, `/jobs/[id]`
- `/creators`, `/creators/[id]`
- `/brands/[id]`

### Кабинет (Brand/Creator)
- `/dashboard` (home)
- `/dashboard/jobs`, `/dashboard/jobs/new`, `/dashboard/jobs/[id]/edit`
- `/dashboard/jobs/[id]/applications`
- `/dashboard/jobs/[id]/review`
- `/dashboard/deals`
- `/dashboard/work`, `/dashboard/work/[id]`
- `/dashboard/inbox`, `/dashboard/inbox/[id]`
- `/dashboard/profile`, `/dashboard/notifications`, `/dashboard/reviews`
- `/dashboard/applications`, `/dashboard/invitations`
- `/dashboard/alerts`, `/dashboard/balance`

### Админ‑панель
- `/admin`
- `/admin/jobs`, `/admin/creators`
- `/admin/disputes`, `/admin/disputes/[id]`
- `/admin/payouts`, `/admin/finance`, `/admin/events`
- `/admin/settings`, `/admin/notifications`

## 3) Ядро UI‑компонентов (10–15 ключевых)
1) `Button` + `IconButton`
2) `Input` / `Textarea` / `Select`
3) `Card` / `Surface`
4) `SectionCard`
5) `PageHeader`
6) `Container`
7) `Badge` (статусы)
8) `Alert`
9) `EmptyState`
10) `Skeleton`
11) `Stepper`
12) `Stat`
13) `Table`
14) `Tabs`
15) `Dialog` / `Drawer`
16) `DropdownMenu`
17) `DataList`
18) `PageToolbar`
17) `SiteHeader` / `SiteFooter`
18) `AppShell` (sidebar + topbar)
19) `JobCard` / `CreatorCard` (если есть отдельные карточки в списках)

## 4) Токены/тема и глобальные стили
- CSS‑переменные в `src/app/globals.css` (`--background`, `--foreground`, `--primary`, `--muted`, `--info/success/warning/danger`, `--radius`).
- Tailwind мапит токены в `tailwind.config.ts`.
- Тема: `data-theme="dark"` + `class="dark"`; инициализация в `src/app/layout.tsx`.
- Базовый шрифт: `Inter` (через `next/font`).

## 5) Риски редизайна (где нельзя ломать)
- **Статусы/бейджи**: единый словарь `src/lib/status-badges.ts`.
- **Роль‑зависимая навигация**: `SiteHeader`, shell‑компоненты.
- **Эскроу/платежи/выплаты**: UI связан с транзакционными статусами.
- **Чат/Inbox**: индикаторы непрочитанного, навигация по диалогам.
- **Профили/верификация**: важны гейты (public+verified).
- **Телеграм‑биндинг**: логика статусов в профиле (PENDING/USED).
- **Витрина `/ui`**: используется как визуальный контракт — менять только согласованно.

## 6) Последовательность редизайна (предлагаемая)
1) **Foundation**  
   Токены/типографика/радиусы/цвета/тема, базовые состояния. *(частично сделано)*
2) **Shell**  
   AppShell (sidebar + topbar) и роль‑ориентированный каркас. *(частично сделано)*
3) **Playground**  
   `/ui` как визуальный контракт дизайн‑системы. *(сделано)*
4) **Pages**  
   Список → деталка → формы (по зонам: Public → Dashboard → Admin).
   - Pilot списка выполнен: `admin/payouts` переведён на `DataList` + `PageToolbar`.  
5) **States**  
   EmptyState, Skeleton, ошибки, подтверждения.
6) **Polish**  
   Микро‑анимации, акценты, финальные правки.

## 7) DoD для редизайна
- Консистентность типографики и отступов.
- Единая система статусов/бейджей/цветов.
- Пустые/загрузочные состояния везде.
- A11y: фокус‑стили, контраст, клавиатура.
- Responsive минимум 360–390px.
- Нет raw‑enum/англ. лейблов в UI.

## 8) Целевое стилевое направление (1 экран)
**“Строгий, но цепляющий”**  
- Нейтральная база, чистая и контрастная типографика.  
- Аккуратные эффекты: лёгкий blur, тонкий noise, gradient‑strokes в акцентах.  
- Микро‑анимации без “шума” (подсветка, fade‑in, мягкие hover).  
- Разделение ролей:  
  - **Creator** — чуть более энергичные акценты.  
  - **Brand** — строгие, деловые акценты.  
  - **Admin** — нейтральный утилитарный стиль.  
