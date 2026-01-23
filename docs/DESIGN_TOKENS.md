# Design Tokens

Документ фиксирует систему дизайн‑токенов в стиле “строгий + эффектный”, чтобы UI развивался без хаоса. Токены реализованы через CSS Custom Properties в `src/app/globals.css` и подключены в Tailwind через `tailwind.config.ts`.

## Цвета

Значения указаны в HSL (без `hsl(...)`). Токены используются как `bg-*`, `text-*`, `border-*`, `ring-*` через Tailwind.

| Токен | Назначение | Light | Dark |
| --- | --- | --- | --- |
| `--background` | фон приложения | `0 0% 100%` | `222 47% 7%` |
| `--foreground` | основной текст | `222 47% 11%` | `210 40% 98%` |
| `--card` | фон карточек/панелей | `0 0% 100%` | `222 47% 9%` |
| `--card-foreground` | текст на карточках | `222 47% 11%` | `210 40% 98%` |
| `--surface` | приподнятая поверхность | `210 20% 98%` | `222 47% 11%` |
| `--surface-foreground` | текст на поверхности | `222 47% 11%` | `210 40% 98%` |
| `--overlay` | модальные/overlay фоны | `0 0% 100%` | `222 47% 10%` |
| `--overlay-foreground` | текст в overlay | `222 47% 11%` | `210 40% 98%` |
| `--muted` | приглушенный фон | `220 14% 96%` | `217 33% 17%` |
| `--muted-foreground` | вторичный текст | `215 16% 47%` | `215 20% 65%` |
| `--border` | границы/разделители | `220 13% 91%` | `217 33% 17%` |
| `--border-soft` | мягкая граница | `220 13% 94%` | `217 33% 20%` |
| `--border-strong` | усиленная граница | `215 12% 82%` | `217 33% 28%` |
| `--ring` | цвет обводки фокуса | `222 47% 11%` | `212 27% 84%` |
| `--primary` | основной акцент (CTA/ссылки) | `248 90% 60%` | `248 90% 60%` |
| `--primary-foreground` | текст на primary | `0 0% 100%` | `0 0% 100%` |
| `--info` | информационный акцент | `210 90% 45%` | `210 90% 70%` |
| `--info-foreground` | текст на info | `0 0% 100%` | `222 47% 7%` |
| `--success` | успех/подтверждение | `142 71% 35%` | `142 65% 55%` |
| `--success-foreground` | текст на success | `0 0% 100%` | `222 47% 7%` |
| `--warning` | предупреждение | `38 92% 45%` | `38 90% 60%` |
| `--warning-foreground` | текст на warning | `0 0% 100%` | `222 47% 7%` |
| `--danger` | ошибка/критично | `0 72% 45%` | `0 80% 65%` |
| `--danger-foreground` | текст на danger | `0 0% 100%` | `222 47% 7%` |
| `--accent-creator` | акцент креатора | `286 85% 62%` | `286 80% 70%` |
| `--accent-brand` | акцент бренда | `210 92% 50%` | `210 92% 70%` |
| `--accent-admin` | акцент админа | `222 10% 30%` | `210 10% 70%` |
| `--glass` | “glass” поверхность | `0 0% 100%` | `222 47% 12%` |
| `--glass-border` | граница glass | `220 13% 90%` | `217 33% 22%` |

Примеры использования:
- `Button` использует `bg-primary text-primary-foreground` и `bg-danger text-danger-foreground` для destructive.
- `Alert` использует `bg-*/10`, `border-*/40`, `text-*` для `info/success/warning/danger`.
- `Badge` использует `bg-primary` (default) и `bg-muted` (soft).
- `Card` использует `bg-card` и `border`.
- Role‑акценты: `bg-accent-creator`, `bg-accent-brand`, `bg-accent-admin` (только для небольших штрихов/бейджей).

## Типография

- Базовый шрифт: `--font-sans` (Next/font в `src/app/layout.tsx`).
- Добавлена “UI‑шкала” через токены и Tailwind‑классы:
  - `text-ui-xs`, `text-ui-sm`, `text-ui-base`, `text-ui-lg`, `text-ui-xl`, `text-ui-2xl`.
  - Линейка/треккинг: `--leading-*`, `--tracking-*`.
  - Веса: `font-ui-normal`, `font-ui-medium`, `font-ui-semibold`.
- Рекомендация:
  - Заголовки: `text-ui-xl` / `text-ui-2xl` + `font-ui-semibold` + `tracking-tight`.
  - Описания: `text-ui-sm` + `text-muted-foreground`.

## Spacing

- Базовая шкала Tailwind без переопределений: `1 = 0.25rem (4px)`, `2 = 0.5rem (8px)`, `3 = 0.75rem (12px)`, `4 = 1rem (16px)`, и т.д.
- Основные отступы экранов: `px-4 py-10`, внутренние отступы карточек: `p-5`, компактные блоки: `p-3/p-4`.

## Радиусы

- `--radius = 14px`.
- Маппинг в Tailwind: `rounded-lg` -> `var(--radius)`, `rounded-md` -> `radius - 2px`, `rounded-sm` -> `radius - 4px`.
- Применение: карточки, формы, пустые состояния, кнопки.

## Тени

| Токен | Назначение | Tailwind |
| --- | --- | --- |
| `--shadow-subtle` | мягкая глубина | `shadow-subtle` |
| `--shadow-raised` | приподнятый блок | `shadow-raised` |
| `--shadow-elevated` | выделение важного блока | `shadow-elevated` |
| `--shadow-glow` | аккуратный glow на hover | `shadow-glow` |

## Поверхности и “glass”

- `surface/overlay` — для обособленных блоков и модальных слоёв.
- `glass` — фон/бордер + `backdrop-blur-glass` (аккуратно, только на небольших участках).

## Layout primitives

### Surface (base / raised / glass / overlay)

**Когда использовать**
- `base`: секции контента на спокойной поверхности.
- `raised`: блоки с акцентом (карточки, hero, важные панели).
- `glass`: небольшие акценты поверх фона (метки/плашки/микро‑карточки).
- `overlay`: модальные слои/дроверы.

**Пример (правильно)**
```tsx
<Surface variant="raised" className="p-6">
  <h3 className="text-ui-base font-ui-semibold">Заголовок</h3>
  <p className="text-ui-sm text-muted-foreground">Описание блока</p>
</Surface>
```

**Антипример**
```tsx
<div className="bg-white shadow-lg rounded-xl">...</div>
```
Причина: хардкод вместо токенов (`bg-card`, `shadow-subtle`, `rounded-lg`).

## Границы

- `border`, `border-border-soft`, `border-border-strong`.
- Толщина: `border-hairline`, `border-soft`, `border-strong`.

## Градиенты

- `bg-accent` — основной акцентный градиент.
- `bg-mesh` — мягкий “mesh” для фонов секций.
- `bg-stroke` — декоративная градиент‑линия/рамка.

## Motion

- Длительности: `duration-fast`, `duration-normal`, `duration-slow`.
- Easing: `ease-standard`, `ease-emphasis`.
- Используем `prefers-reduced-motion` (минимальные анимации).

## Состояния (hover/focus/disabled)

- Hover: обычно через `hover:bg-muted/60` или `hover:opacity-95`.
- Focus: `focus-visible:ring-2` + `ring-ring` (цвет `--ring`).
- Disabled: `disabled:opacity-50 disabled:pointer-events-none`.
- Формы: `Input/Select/Textarea` используют `focus-visible:border-ring` + `ring-ring` и `transition-colors`.
- Степпер/бейджи: используем `transition-colors` без изменения токенов.

## Data display

### Table
**Когда использовать**
- списки в админке/кабинете с 3+ колонками;
- всегда с `overflow-x-auto` для мобильных.

**Пример (правильно)**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Название</TableHead>
      <TableHead>Статус</TableHead>
      <TableHead>Дата</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Элемент</TableCell>
      <TableCell className="text-muted-foreground">Активен</TableCell>
      <TableCell className="text-muted-foreground">Сегодня</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

**Антипример**
```tsx
<table className="w-full text-xs">...</table>
```
Причина: нет токенов, нет состояния hover и consistent padding.

### DataList
**Когда использовать**
- списки карточек/строк в кабинетах и админке (когда таблица избыточна);
- компактные ряды с заголовком + мета + действия.

**Пример (правильно)**
```tsx
<DataList>
  <DataListHeader>Последние заявки</DataListHeader>
  <DataListItem>
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-ui-sm font-ui-medium">Заявка #1</div>
        <div className="text-ui-xs text-muted-foreground">Мета-инфо</div>
      </div>
      <Badge variant="soft">Новая</Badge>
    </div>
  </DataListItem>
  <DataListItem interactive asChild>
    <Link href="/dashboard/item/1">Открыть</Link>
  </DataListItem>
</DataList>
```

**Антипример**
```tsx
<div className="space-y-4">
  <div className="rounded-xl shadow-lg">...</div>
</div>
```
Причина: нет единого примитива списка, случайные стили и разные отступы.

## Navigation

### Tabs
**Когда использовать**
- внутри страниц/карточек для переключения подразделов;
- не использовать для URL‑навигации (это роутинг‑табы).

**Пример (правильно)**
```tsx
<Tabs value={tab} onValueChange={setTab}>
  <TabsList>
    <TabsTrigger value="overview">Обзор</TabsTrigger>
    <TabsTrigger value="details">Детали</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">...</TabsContent>
  <TabsContent value="details">...</TabsContent>
</Tabs>
```

**Антипример**
```tsx
<div className="flex gap-4">
  <button>Tab 1</button>
  <button>Tab 2</button>
</div>
```
Причина: нет role/aria, нет активного состояния через токены.

### PageToolbar
**Когда использовать**
- верх страницы в dashboard/admin: заголовок + описание + действия.

**Пример (правильно)**
```tsx
<PageToolbar>
  <div className="space-y-1">
    <PageToolbarTitle>Заявки</PageToolbarTitle>
    <PageToolbarDescription>Короткое пояснение</PageToolbarDescription>
  </div>
  <PageToolbarActions>
    <Button variant="outline">Экспорт</Button>
    <Button>Создать</Button>
  </PageToolbarActions>
</PageToolbar>
```

**Антипример**
```tsx
<div className="flex justify-between">
  <h1>Заголовок</h1>
</div>
```
Причина: нет единого паттерна, нет места под actions/описание.

## Overlays

### Dialog
**Когда использовать**
- подтверждения, критичные действия, детали;
- обязательно `aria-modal`, закрытие по Esc, scroll‑lock.

**Пример (правильно)**
```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild><Button>Открыть</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Подтверждение</DialogTitle>
      <DialogDescription>Описание</DialogDescription>
    </DialogHeader>
    <DialogFooter>...</DialogFooter>
  </DialogContent>
</Dialog>
```

**Антипример**
```tsx
<div className="fixed inset-0">...</div>
```
Причина: нет семантики, нет scroll‑lock, нет restore‑focus.

### Drawer
**Когда использовать**
- мобильные фильтры/меню/формы;
- по умолчанию `bottom`, на desktop можно `right`.

**Пример (правильно)**
```tsx
<Drawer open={open} onOpenChange={setOpen}>
  <DrawerTrigger asChild><Button>Фильтры</Button></DrawerTrigger>
  <DrawerContent>
    <DrawerHeader>...</DrawerHeader>
    <DrawerBody>...</DrawerBody>
  </DrawerContent>
</Drawer>
```

**Антипример**
```tsx
<aside className="fixed bottom-0">...</aside>
```
Причина: нет overlay, нет закрытия по Esc, нет focus restore.

## Controls

### IconButton
**Когда использовать**
- только иконки без текста: сервисные действия (меню, закрыть, свернуть);
- обязательно `aria-label`.

**Пример (правильно)**
```tsx
<IconButton variant="ghost" size="sm" aria-label="Открыть меню">
  <Menu className="h-4 w-4" />
</IconButton>
```

**Антипример**
```tsx
<button>☰</button>
```
Причина: нет aria‑label, нет токенов/состояний.

### DropdownMenu
**Когда использовать**
- действия профиля/ролей, вторичные действия в топбаре.
- Требования a11y: `aria-haspopup="menu"`, `aria-expanded`, `role="menu"/"menuitem"`, закрытие по Esc/outside click.

**Пример (правильно)**
```tsx
<DropdownMenu open={open} onOpenChange={setOpen}>
  <DropdownMenuTrigger asChild>
    <IconButton aria-label="Открыть меню">
      <User className="h-4 w-4" />
    </IconButton>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>Аккаунт</DropdownMenuLabel>
    <DropdownMenuItem>Настройки</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem asChild><LogoutButton /></DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Антипример**
```tsx
<div onClick={toggle}>Profile</div>
```
Причина: нет ролей/aria, нет закрытия по Esc, нет restore‑focus.

## Примечания по нормализации

- Семантические токены (`info/success/warning/danger`) используются в `Alert`, `Button`, `Badge`.
- Ошибки и успехи в формах переведены на `text-danger` и `text-success`.
- Стили чекбоксов используют `accent-primary` вместо хардкода.
- Темная тема поддерживается через `.dark` или `data-theme="dark"` на `<html>`.

## DoD для компонентов/страниц

- `focus-visible` ring виден при клавиатурной навигации.
- Пустые состояния (`EmptyState`) и загрузки (`Skeleton`) для списков.
- Единые `border-*`, `shadow-*`, `rounded-*` без локального хардкода.

## Примеры применения (4 компонента)

1) **Card**
   - `bg-card text-card-foreground border border-border shadow-subtle`
2) **Button (primary)**
   - `bg-primary text-primary-foreground hover:bg-primary/90 shadow-subtle`
3) **Section**
   - `bg-surface text-surface-foreground border border-border-soft`
4) **Glass**
   - `bg-glass/60 border border-glass-border backdrop-blur-glass shadow-raised`

## Переключатель темы

- UI‑переключатель: `ThemeToggle` (`src/components/theme-toggle.tsx`) с вариантами `system/light/dark`.
- Хранение выбора: `localStorage` ключ `theme`.
- Применение: на `<html>` выставляется `data-theme="light|dark"` (для `system` применяется настройка ОС).
- Для предотвращения FOUC используется ранний inline‑скрипт в `src/app/layout.tsx`.
