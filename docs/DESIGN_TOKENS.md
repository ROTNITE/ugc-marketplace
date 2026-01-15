# Design Tokens

Документ фиксирует базовую систему дизайн-токенов, чтобы все экраны использовали единые значения цветов, радиусов и типографики. Токены реализованы через CSS Custom Properties в `src/app/globals.css` и подключены в Tailwind через `tailwind.config.ts`.

## Цвета

Значения указаны в HSL (без `hsl(...)`). Токены используются как `bg-*`, `text-*`, `border-*`, `ring-*` через Tailwind.

| Токен | Назначение | Light | Dark |
| --- | --- | --- | --- |
| `--background` | фон приложения | `0 0% 100%` | `222 47% 7%` |
| `--foreground` | основной текст | `222 47% 11%` | `210 40% 98%` |
| `--card` | фон карточек/панелей | `0 0% 100%` | `222 47% 9%` |
| `--card-foreground` | текст на карточках | `222 47% 11%` | `210 40% 98%` |
| `--muted` | приглушенный фон | `220 14% 96%` | `217 33% 17%` |
| `--muted-foreground` | вторичный текст | `215 16% 47%` | `215 20% 65%` |
| `--border` | границы/разделители | `220 13% 91%` | `217 33% 17%` |
| `--ring` | цвет обводки фокуса | `222 47% 11%` | `212 27% 84%` |
| `--primary` | основной акцент (CTA/ссылки) | `248 90% 60%` | `248 90% 60%` |
| `--primary-foreground` | текст на primary | `0 0% 100%` | `0 0% 100%` |
| `--info` | информационный акцент | `210 90% 45%` | `210 90% 70%` |
| `--info-foreground` | текст на info | `0 0% 100%` | `0 0% 100%` |
| `--success` | успех/подтверждение | `142 71% 35%` | `142 65% 55%` |
| `--success-foreground` | текст на success | `0 0% 100%` | `0 0% 100%` |
| `--warning` | предупреждение | `38 92% 45%` | `38 90% 60%` |
| `--warning-foreground` | текст на warning | `0 0% 100%` | `0 0% 100%` |
| `--danger` | ошибка/критично | `0 72% 45%` | `0 80% 65%` |
| `--danger-foreground` | текст на danger | `0 0% 100%` | `0 0% 100%` |

Примеры использования:
- `Button` использует `bg-primary text-primary-foreground` и `bg-danger text-danger-foreground` для destructive.
- `Alert` использует `bg-*/10`, `border-*/40`, `text-*` для `info/success/warning/danger`.
- `Badge` использует `bg-primary` (default) и `bg-muted` (soft).
- `Card` использует `bg-card` и `border`.

## Типография

- Базовый шрифт: `--font-sans` (подключен через Next/font в `src/app/layout.tsx`).
- Tailwind шкала используется по умолчанию (`text-xs` -> `text-3xl`), в UI чаще встречаются `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-2xl`, `text-3xl`.
- Заголовки: `PageHeader`/`CardTitle` задают `text-2xl`/`text-base` с `font-semibold`.

## Spacing

- Базовая шкала Tailwind без переопределений: `1 = 0.25rem (4px)`, `2 = 0.5rem (8px)`, `3 = 0.75rem (12px)`, `4 = 1rem (16px)`, и т.д.
- Основные отступы экранов: `px-4 py-10`, внутренние отступы карточек: `p-5`, компактные блоки: `p-3/p-4`.

## Радиусы

- `--radius = 14px`.
- Маппинг в Tailwind: `rounded-lg` -> `var(--radius)`, `rounded-md` -> `radius - 2px`, `rounded-sm` -> `radius - 4px`.
- Применение: карточки, формы, пустые состояния, кнопки.

## Границы и тени

- Границы: 1px (`border`), цвет — `--border`.
- Тени: используются стандартные `shadow-sm` на карточках, кастомных токенов нет.

## Состояния (hover/focus/disabled)

- Hover: обычно через `hover:bg-muted/60` или `hover:opacity-95`.
- Focus: `focus-visible:ring-2` + `ring-ring` (цвет `--ring`).
- Disabled: `disabled:opacity-50 disabled:pointer-events-none`.

## Примечания по нормализации

- Семантические токены (`info/success/warning/danger`) используются в `Alert`, `Button`, `Badge`.
- Ошибки и успехи в формах переведены на `text-danger` и `text-success`.
- Стили чекбоксов используют `accent-primary` вместо хардкода.
- Темная тема поддерживается через `.dark` или `data-theme="dark"` на `<html>`.
