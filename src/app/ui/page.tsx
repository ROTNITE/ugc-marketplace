import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, CardGridSkeleton, ListSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import { Stat } from "@/components/ui/stat";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { DataList, DataListHeader, DataListItem } from "@/components/ui/data-list";
import { PageToolbar, PageToolbarActions, PageToolbarDescription, PageToolbarTitle } from "@/components/ui/page-toolbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlaygroundTabs } from "@/components/ui/playground-tabs";
import { PlaygroundDialogDrawer } from "@/components/ui/playground-dialog-drawer";
import { PlaygroundMenu } from "@/components/ui/playground-menu";

const COLORS = [
  { label: "Фон", className: "bg-background text-foreground border border-border-soft" },
  { label: "Поверхность", className: "bg-surface text-surface-foreground border border-border-soft" },
  { label: "Карточка", className: "bg-card text-card-foreground border border-border-soft" },
  { label: "Приглушённый", className: "bg-muted text-muted-foreground border border-border-soft" },
  { label: "Основной", className: "bg-primary text-primary-foreground" },
  { label: "Инфо", className: "bg-info text-info-foreground" },
  { label: "Успех", className: "bg-success text-success-foreground" },
  { label: "Предупреждение", className: "bg-warning text-warning-foreground" },
  { label: "Ошибка", className: "bg-danger text-danger-foreground" },
];

const SHADOWS = [
  { label: "Мягкая", className: "shadow-subtle" },
  { label: "Приподнятая", className: "shadow-raised" },
  { label: "Глубокая", className: "shadow-elevated" },
  { label: "Свечение", className: "shadow-glow" },
];

const ROLE_ACCENTS = [
  { label: "Креатор", className: "bg-accent-creator text-accent-creator-foreground" },
  { label: "Бренд", className: "bg-accent-brand text-accent-brand-foreground" },
  { label: "Админ", className: "bg-accent-admin text-accent-admin-foreground" },
];

export default function UiPlaygroundPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="bg-background text-foreground">
      <Container size="xl" className="py-10 space-y-12">
        <PageHeader
          title="Витрина UI"
          description="Дизайн‑система и компоненты в одном месте для быстрого визуального ревью."
        />

        <Surface
          variant="raised"
          className="relative overflow-hidden border border-border-soft p-8 shadow-elevated motion-reduce:transition-none"
        >
          <div className="absolute inset-0 pointer-events-none opacity-70">
            <div className="h-full w-full bg-mesh" />
          </div>
          <div className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-soft-light" style={{
            backgroundImage:
              "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"120\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"2\"/></filter><rect width=\"120\" height=\"120\" filter=\"url(%23n)\" opacity=\"0.3\"/></svg>')",
          }} />
          <div className="relative space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-background/70 px-3 py-1 text-ui-xs text-muted-foreground backdrop-blur-glass">
              Витрина / Токены / Компоненты
            </div>
            <h2 className="text-ui-2xl font-ui-semibold tracking-tight">
              Строгий, но эффектный каркас интерфейса
            </h2>
            <p className="max-w-2xl text-ui-sm text-muted-foreground leading-relaxed">
              Нейтральная база, аккуратные эффекты, роли‑акценты. Здесь собраны основные элементы,
              чтобы быстро оценивать визуал и состояние компонентов.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm">Основная</Button>
              <Button size="sm" variant="secondary">
                Вторичная
              </Button>
              <Button size="sm" variant="outline">
                Контур
              </Button>
              <Button size="sm" variant="ghost">
                Призрак
              </Button>
              <Button size="sm" variant="destructive">
                Опасная
              </Button>
            </div>
          </div>
        </Surface>

        <section className="space-y-6">
          <h3 className="text-ui-lg font-ui-semibold">Токены</h3>
          <div className="grid gap-4 lg:grid-cols-3">
            <Surface variant="base" className="p-5">
              <div className="text-ui-sm font-ui-semibold">Типографика</div>
              <div className="mt-4 space-y-2">
                <div className="text-ui-xs text-muted-foreground">text-ui-xs</div>
                <div className="text-ui-sm">text-ui-sm</div>
                <div className="text-ui-base">text-ui-base</div>
                <div className="text-ui-lg">text-ui-lg</div>
                <div className="text-ui-xl font-ui-semibold">text-ui-xl</div>
                <div className="text-ui-2xl font-ui-semibold">text-ui-2xl</div>
              </div>
            </Surface>
            <Surface variant="base" className="p-5">
              <div className="text-ui-sm font-ui-semibold">Цвета</div>
              <div className="mt-4 grid gap-2">
                {COLORS.map((item) => (
                  <div key={item.label} className={`flex items-center justify-between rounded-md px-3 py-2 text-ui-xs ${item.className}`}>
                    <span>{item.label}</span>
                    <span className="opacity-70">токен</span>
                  </div>
                ))}
              </div>
            </Surface>
            <Surface variant="base" className="p-5">
              <div className="text-ui-sm font-ui-semibold">Тени и радиусы</div>
              <div className="mt-4 grid gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-sm border border-border-soft bg-card" />
                  <div className="h-8 w-8 rounded-md border border-border-soft bg-card" />
                  <div className="h-8 w-8 rounded-lg border border-border-soft bg-card" />
                </div>
                <div className="grid gap-2">
                  {SHADOWS.map((item) => (
                    <div key={item.label} className={`rounded-md border border-border-soft bg-card px-3 py-2 text-ui-xs ${item.className}`}>
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            </Surface>
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="text-ui-lg font-ui-semibold">Компоненты</h3>
          <div className="grid gap-6 lg:grid-cols-2">
            <Surface variant="base" className="p-5 space-y-4">
              <div className="text-ui-sm font-ui-semibold">Кнопки и бейджи</div>
              <div className="flex flex-wrap gap-2">
                <Button>Основная</Button>
                <Button variant="secondary">Вторичная</Button>
                <Button variant="outline">Контур</Button>
                <Button variant="ghost">Призрак</Button>
                <Button variant="destructive">Опасная</Button>
                <Button disabled>Отключена</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>Основной</Badge>
                <Badge tone="info">Инфо</Badge>
                <Badge tone="success">Успех</Badge>
                <Badge tone="warning">Предупреждение</Badge>
                <Badge tone="danger">Ошибка</Badge>
                <Badge variant="soft">Мягкий</Badge>
              </div>
            </Surface>

            <Surface variant="base" className="p-5 space-y-4">
              <div className="text-ui-sm font-ui-semibold">Формы</div>
              <div className="grid gap-3">
                <Input placeholder="Введите текст" />
                <Textarea placeholder="Описание или комментарий" />
                <Select defaultValue="">
                  <option value="" disabled>
                    Выберите значение
                  </option>
                  <option>Вариант 1</option>
                  <option>Вариант 2</option>
                </Select>
              </div>
            </Surface>

            <Surface variant="base" className="p-5 space-y-4">
              <div className="text-ui-sm font-ui-semibold">Карточки и Surface</div>
              <Card>
                <CardHeader>
                  <CardTitle>Карточка</CardTitle>
                  <CardDescription>Базовый контейнер для блоков</CardDescription>
                </CardHeader>
                <CardContent className="text-ui-sm text-muted-foreground">
                  Текст внутри карточки, аккуратные отступы и тени.
                </CardContent>
              </Card>
              <div className="grid gap-3 sm:grid-cols-3">
                <Surface variant="base" className="p-3 text-ui-xs text-muted-foreground">
                  Base
                </Surface>
                <Surface variant="raised" className="p-3 text-ui-xs text-muted-foreground">
                  Raised
                </Surface>
                <Surface variant="glass" className="p-3 text-ui-xs text-muted-foreground">
                  Glass
                </Surface>
              </div>
            </Surface>

            <Surface variant="base" className="p-5 space-y-4">
              <div className="text-ui-sm font-ui-semibold">Таблица / Диалог / Шторка</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Столбец</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Дата</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {["A", "B", "C"].map((row) => (
                    <TableRow key={row}>
                      <TableCell>Строка {row}</TableCell>
                      <TableCell className="text-muted-foreground">Активно</TableCell>
                      <TableCell className="text-muted-foreground">Сегодня</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="rounded-md border border-border-soft bg-overlay/60 p-4 text-ui-xs text-muted-foreground">
                Диалог: overlay + surface + акцент.
              </div>
              <PlaygroundDialogDrawer />
            </Surface>

            <Surface variant="base" className="p-5 space-y-4">
              <div className="text-ui-sm font-ui-semibold">Табы</div>
              <PlaygroundTabs />
            </Surface>

            <Surface variant="base" className="p-5 space-y-4">
              <div className="text-ui-sm font-ui-semibold">Меню профиля</div>
              <div className="text-ui-xs text-muted-foreground">
                Пример DropdownMenu + IconButton.
              </div>
              <PlaygroundMenu />
            </Surface>

            <Surface variant="base" className="p-5 space-y-4">
              <div className="text-ui-sm font-ui-semibold">Toolbar и списки</div>
              <PageToolbar className="border-0 pb-0">
                <div className="space-y-1">
                  <PageToolbarTitle>Заголовок страницы</PageToolbarTitle>
                  <PageToolbarDescription>Короткое пояснение или статус.</PageToolbarDescription>
                </div>
                <PageToolbarActions>
                  <Button size="sm" variant="outline">Экспорт</Button>
                  <Button size="sm">Создать</Button>
                </PageToolbarActions>
              </PageToolbar>
              <DataList>
                <DataListHeader>Последние элементы</DataListHeader>
                <DataListItem>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-ui-sm font-ui-medium">Запись #1</div>
                      <div className="text-ui-xs text-muted-foreground">Мета-информация и статус</div>
                    </div>
                    <Badge variant="soft">Новая</Badge>
                  </div>
                </DataListItem>
                <DataListItem>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-ui-sm font-ui-medium">Запись #2</div>
                      <div className="text-ui-xs text-muted-foreground">Вторая строка списка</div>
                    </div>
                    <Badge tone="info">В работе</Badge>
                  </div>
                </DataListItem>
                <DataListItem interactive asChild>
                  <Link
                    className="flex items-start justify-between gap-3"
                    href="#"
                  >
                    <div>
                      <div className="text-ui-sm font-ui-medium">Перейти к элементу</div>
                      <div className="text-ui-xs text-muted-foreground">Пример interactive + asChild</div>
                    </div>
                    <Badge variant="soft">Link</Badge>
                  </Link>
                </DataListItem>
                <DataListItem disabled>
                  <div className="text-ui-xs text-muted-foreground">Недоступный элемент</div>
                </DataListItem>
              </DataList>
            </Surface>

            <Surface variant="base" className="p-5 space-y-4">
              <div className="text-ui-sm font-ui-semibold">Фокус и доступность</div>
              <div className="text-ui-xs text-muted-foreground">
                Перемещайтесь по элементам с клавиатуры (Tab), чтобы увидеть ring.
              </div>
              <div className="flex flex-wrap gap-2">
                <Input placeholder="Фокус на инпуте" />
                <Button variant="outline">Фокус на кнопке</Button>
              </div>
            </Surface>
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="text-ui-lg font-ui-semibold">Состояния</h3>
          <div className="grid gap-6 lg:grid-cols-3">
            <Surface variant="base" className="p-5 space-y-3">
              <div className="text-ui-sm font-ui-semibold">Загрузка</div>
              <Skeleton className="h-10 w-full" />
              <ListSkeleton rows={3} />
            </Surface>
            <Surface variant="base" className="p-5 space-y-3">
              <div className="text-ui-sm font-ui-semibold">Пустое</div>
              <EmptyState title="Нет данных" description="Состояние пустого списка." />
            </Surface>
            <Surface variant="base" className="p-5 space-y-3">
              <div className="text-ui-sm font-ui-semibold">Ошибки и алерты</div>
              <Alert variant="warning" title="Внимание">
                Сообщение‑предупреждение.
              </Alert>
              <Alert variant="danger" title="Ошибка">
                Ошибка валидации.
              </Alert>
            </Surface>
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="text-ui-lg font-ui-semibold">Ролевые акценты</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {ROLE_ACCENTS.map((item) => (
              <Surface key={item.label} variant="base" className="p-5 space-y-3">
                <div className={`inline-flex rounded-full px-3 py-1 text-ui-xs font-ui-medium ${item.className}`}>
                  {item.label}
                </div>
                <div className="text-ui-sm text-muted-foreground">
                  Акцент для роли — только точечные метки/бейджи.
                </div>
              </Surface>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="text-ui-lg font-ui-semibold">Статы и скелеты</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Активные сделки" value="12" hint="За неделю" />
            <Stat label="Средний рейтинг" value="4.8" hint="на 27 отзывах" />
            <Stat label="Доход" value="78 200 ₽" hint="30 дней" />
          </div>
          <CardGridSkeleton cards={3} />
          <TableSkeleton rows={4} columns={3} />
        </section>
      </Container>
    </div>
  );
}
