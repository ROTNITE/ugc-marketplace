# PON

## Структура проекта (без node_modules и .next)

```
ugc-marketplace-skeleton
|-- docs
|   |-- ARCHITECTURE.md
|   |-- FUTURE_TELEGRAM_BOT.md
|   `-- OUTBOX_BOT_SIMULATOR.md
|-- prisma
|   |-- migrations
|   |   |-- 20260107155530_init
|   |   |   `-- migration.sql
|   |   |-- 20260107170000_invitation
|   |   |   `-- migration.sql
|   |   |-- 20260107180000_notifications
|   |   |   `-- migration.sql
|   |   |-- 20260107183000_reviews
|   |   |   `-- migration.sql
|   |   |-- 20260107201500_add_ledger_and_escrow
|   |   |   `-- migration.sql
|   |   |-- 20260107210000_add_payout_requests
|   |   |   `-- migration.sql
|   |   |-- 20260107222000_creator_visibility
|   |   |   `-- migration.sql
|   |   |-- 20260107225821_add_indexes_v1
|   |   |   `-- migration.sql
|   |   |-- 20260107233519_add_job_moderation_audit
|   |   |   `-- migration.sql
|   |   |-- 20260107235534_creator_verification_audit
|   |   |   `-- migration.sql
|   |   |-- 20260108103911_add_disputes
|   |   |   `-- migration.sql
|   |   |-- 20260108120000_add_job_alerts
|   |   |   `-- migration.sql
|   |   |-- 20260108120000_platform_settings
|   |   |   `-- migration.sql
|   |   |-- 20260108131500_add_conversation_participants_read_state
|   |   |   `-- migration.sql
|   |   |-- 20260108133000_cancel_workflow
|   |   |   `-- migration.sql
|   |   |-- 20260108154602_
|   |   |   `-- migration.sql
|   |   |-- 20260108160000_add_dispute_messages
|   |   |   `-- migration.sql
|   |   |-- 20260108190000_add_telegram_binding
|   |   |   `-- migration.sql
|   |   `-- migration_lock.toml
|   |-- schema.prisma
|   `-- seed.ts
|-- scripts
|   |-- check-docker.mjs
|   |-- db-wait.mjs
|   |-- outbox-consumer.ts
|   `-- with-db-url.mjs
|-- src
|   |-- app
|   |   |-- (auth)
|   |   |   |-- login
|   |   |   |   `-- page.tsx
|   |   |   `-- register
|   |   |       `-- page.tsx
|   |   |-- admin
|   |   |   |-- creators
|   |   |   |   `-- page.tsx
|   |   |   |-- disputes
|   |   |   |   |-- [id]
|   |   |   |   |   `-- page.tsx
|   |   |   |   `-- page.tsx
|   |   |   |-- events
|   |   |   |   `-- page.tsx
|   |   |   |-- finance
|   |   |   |   `-- page.tsx
|   |   |   |-- jobs
|   |   |   |   `-- page.tsx
|   |   |   |-- payouts
|   |   |   |   `-- page.tsx
|   |   |   |-- settings
|   |   |   |   `-- page.tsx
|   |   |   |-- layout.tsx
|   |   |   `-- page.tsx
|   |   |-- api
|   |   |   |-- admin
|   |   |   |   |-- creators
|   |   |   |   |   `-- [id]
|   |   |   |   |       |-- reject
|   |   |   |   |       |   `-- route.ts
|   |   |   |   |       `-- verify
|   |   |   |   |           `-- route.ts
|   |   |   |   |-- disputes
|   |   |   |   |   `-- [id]
|   |   |   |   |       |-- resolve-refund
|   |   |   |   |       |   `-- route.ts
|   |   |   |   |       `-- resolve-release
|   |   |   |   |           `-- route.ts
|   |   |   |   |-- finance
|   |   |   |   |   `-- adjust
|   |   |   |   |       `-- route.ts
|   |   |   |   |-- jobs
|   |   |   |   |   `-- [id]
|   |   |   |   |       |-- approve
|   |   |   |   |       |   `-- route.ts
|   |   |   |   |       `-- reject
|   |   |   |   |           `-- route.ts
|   |   |   |   |-- payouts
|   |   |   |   |   `-- [id]
|   |   |   |   |       |-- approve
|   |   |   |   |       |   `-- route.ts
|   |   |   |   |       `-- reject
|   |   |   |   |           `-- route.ts
|   |   |   |   `-- settings
|   |   |   |       `-- route.ts
|   |   |   |-- alerts
|   |   |   |   |-- [id]
|   |   |   |   |   |-- toggle
|   |   |   |   |   |   `-- route.ts
|   |   |   |   |   `-- route.ts
|   |   |   |   `-- route.ts
|   |   |   |-- applications
|   |   |   |   `-- [id]
|   |   |   |       `-- withdraw
|   |   |   |           `-- route.ts
|   |   |   |-- auth
|   |   |   |   |-- [...nextauth]
|   |   |   |   |   `-- route.ts
|   |   |   |   `-- register
|   |   |   |       `-- route.ts
|   |   |   |-- brand
|   |   |   |   `-- profile
|   |   |   |       `-- route.ts
|   |   |   |-- conversations
|   |   |   |   |-- [id]
|   |   |   |   |   |-- delete
|   |   |   |   |   |   `-- route.ts
|   |   |   |   |   `-- messages
|   |   |   |   |       `-- route.ts
|   |   |   |   |-- clear
|   |   |   |   |   `-- route.ts
|   |   |   |   `-- route.ts
|   |   |   |-- creator
|   |   |   |   |-- profile
|   |   |   |   |   `-- route.ts
|   |   |   |   `-- verification
|   |   |   |       |-- generate
|   |   |   |       |   `-- route.ts
|   |   |   |       |-- request
|   |   |   |       |   `-- route.ts
|   |   |   |       `-- submit
|   |   |   |           `-- route.ts
|   |   |   |-- disputes
|   |   |   |   `-- [id]
|   |   |   |       `-- messages
|   |   |   |           `-- route.ts
|   |   |   |-- escrow
|   |   |   |   `-- [jobId]
|   |   |   |       `-- fund
|   |   |   |           `-- route.ts
|   |   |   |-- health
|   |   |   |   `-- route.ts
|   |   |   |-- invitations
|   |   |   |   |-- [id]
|   |   |   |   |   |-- accept
|   |   |   |   |   |   `-- route.ts
|   |   |   |   |   `-- decline
|   |   |   |   |       `-- route.ts
|   |   |   |   `-- route.ts
|   |   |   |-- jobs
|   |   |   |   |-- [id]
|   |   |   |   |   |-- applications
|   |   |   |   |   |   `-- [applicationId]
|   |   |   |   |   |       |-- accept
|   |   |   |   |   |       |   `-- route.ts
|   |   |   |   |   |       `-- reject
|   |   |   |   |   |           `-- route.ts
|   |   |   |   |   |-- apply
|   |   |   |   |   |   `-- route.ts
|   |   |   |   |   |-- cancel
|   |   |   |   |   |   `-- route.ts
|   |   |   |   |   |-- dispute
|   |   |   |   |   |   `-- open
|   |   |   |   |   |       `-- route.ts
|   |   |   |   |   |-- duplicate
|   |   |   |   |   |   `-- route.ts
|   |   |   |   |   |-- pause
|   |   |   |   |   |   `-- route.ts
|   |   |   |   |   |-- resubmit
|   |   |   |   |   |   `-- route.ts
|   |   |   |   |   |-- review
|   |   |   |   |   |   |-- approve
|   |   |   |   |   |   |   `-- route.ts
|   |   |   |   |   |   `-- request-changes
|   |   |   |   |   |       `-- route.ts
|   |   |   |   |   |-- submissions
|   |   |   |   |   |   `-- route.ts
|   |   |   |   |   |-- unpause
|   |   |   |   |   |   `-- route.ts
|   |   |   |   |   `-- route.ts
|   |   |   |   `-- route.ts
|   |   |   |-- notifications
|   |   |   |   |-- [id]
|   |   |   |   |   |-- open
|   |   |   |   |   |   `-- route.ts
|   |   |   |   |   `-- read
|   |   |   |   |       `-- route.ts
|   |   |   |   |-- clear
|   |   |   |   |   `-- route.ts
|   |   |   |   |-- list
|   |   |   |   |-- read-all
|   |   |   |   |   `-- route.ts
|   |   |   |   `-- summary
|   |   |   |-- outbox
|   |   |   |   |-- ack
|   |   |   |   |   `-- route.ts
|   |   |   |   `-- pull
|   |   |   |       `-- route.ts
|   |   |   |-- payouts
|   |   |   |   |-- [id]
|   |   |   |   |   `-- cancel
|   |   |   |   |       `-- route.ts
|   |   |   |   `-- request
|   |   |   |       `-- route.ts
|   |   |   |-- reviews
|   |   |   |   `-- route.ts
|   |   |   `-- telegram
|   |   |       `-- bind
|   |   |           |-- code
|   |   |           |   `-- route.ts
|   |   |           |-- confirm
|   |   |           |   `-- route.ts
|   |   |           `-- unlink
|   |   |               `-- route.ts
|   |   |-- brands
|   |   |   `-- [id]
|   |   |       `-- page.tsx
|   |   |-- creators
|   |   |   |-- [id]
|   |   |   |   `-- page.tsx
|   |   |   `-- page.tsx
|   |   |-- dashboard
|   |   |   |-- alerts
|   |   |   |   `-- page.tsx
|   |   |   |-- applications
|   |   |   |   `-- page.tsx
|   |   |   |-- balance
|   |   |   |   `-- page.tsx
|   |   |   |-- deals
|   |   |   |   `-- page.tsx
|   |   |   |-- inbox
|   |   |   |   |-- [id]
|   |   |   |   |   `-- page.tsx
|   |   |   |   `-- page.tsx
|   |   |   |-- invitations
|   |   |   |   `-- page.tsx
|   |   |   |-- jobs
|   |   |   |   |-- [id]
|   |   |   |   |   |-- applications
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- edit
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   `-- review
|   |   |   |   |       `-- page.tsx
|   |   |   |   |-- new
|   |   |   |   |   `-- page.tsx
|   |   |   |   `-- page.tsx
|   |   |   |-- notifications
|   |   |   |   `-- page.tsx
|   |   |   |-- profile
|   |   |   |   `-- page.tsx
|   |   |   |-- reviews
|   |   |   |   `-- page.tsx
|   |   |   |-- work
|   |   |   |   |-- [id]
|   |   |   |   |   `-- page.tsx
|   |   |   |   `-- page.tsx
|   |   |   `-- page.tsx
|   |   |-- jobs
|   |   |   |-- [id]
|   |   |   |   `-- page.tsx
|   |   |   `-- page.tsx
|   |   |-- error.tsx
|   |   |-- globals.css
|   |   |-- layout.tsx
|   |   |-- not-found.tsx
|   |   |-- page.tsx
|   |   `-- providers.tsx
|   |-- components
|   |   |-- admin
|   |   |   |-- creator-verification-actions.tsx
|   |   |   |-- finance-adjust-form.tsx
|   |   |   |-- job-moderation-actions.tsx
|   |   |   `-- platform-settings-form.tsx
|   |   |-- alerts
|   |   |   `-- alert-row-actions.tsx
|   |   |-- applications
|   |   |   |-- brand-application-actions.tsx
|   |   |   `-- withdraw-button.tsx
|   |   |-- brand
|   |   |   `-- profile-form.tsx
|   |   |-- creator
|   |   |   `-- profile-form.tsx
|   |   |-- creators
|   |   |   |-- creator-filters.tsx
|   |   |   `-- invite-creator-dialog.tsx
|   |   |-- dashboard
|   |   |   `-- logout-button.tsx
|   |   |-- disputes
|   |   |   |-- dispute-message-form.tsx
|   |   |   |-- dispute-message-list.tsx
|   |   |   |-- dispute-open-form.tsx
|   |   |   `-- dispute-resolve-actions.tsx
|   |   |-- escrow
|   |   |   `-- escrow-fund-button.tsx
|   |   |-- forms
|   |   |   |-- job-create-wizard.tsx
|   |   |   |-- login-form.tsx
|   |   |   `-- register-form.tsx
|   |   |-- home
|   |   |   |-- admin-home.tsx
|   |   |   |-- brand-home.tsx
|   |   |   `-- creator-home.tsx
|   |   |-- inbox
|   |   |   |-- clear-completed-conversations-button.tsx
|   |   |   |-- conversation-delete-button.tsx
|   |   |   `-- message-composer.tsx
|   |   |-- invitations
|   |   |   `-- invitation-actions.tsx
|   |   |-- jobs
|   |   |   |-- cancel-deal-button.tsx
|   |   |   |-- job-actions.tsx
|   |   |   |-- job-alert-creator.tsx
|   |   |   |-- job-apply-form.tsx
|   |   |   |-- job-card.tsx
|   |   |   |-- job-filters.tsx
|   |   |   `-- job-resubmit-button.tsx
|   |   |-- landing
|   |   |   |-- cta.tsx
|   |   |   |-- features.tsx
|   |   |   |-- hero.tsx
|   |   |   |-- how-it-works.tsx
|   |   |   `-- safety.tsx
|   |   |-- notifications
|   |   |   |-- clear-all-button.tsx
|   |   |   |-- mark-all-read-button.tsx
|   |   |   `-- mark-read-button.tsx
|   |   |-- payouts
|   |   |   |-- admin-payout-actions.tsx
|   |   |   |-- payout-cancel-button.tsx
|   |   |   `-- payout-request-form.tsx
|   |   |-- reviews
|   |   |   `-- review-form.tsx
|   |   |-- telegram
|   |   |   `-- telegram-binding-card.tsx
|   |   |-- ui
|   |   |   |-- alert.tsx
|   |   |   |-- badge.tsx
|   |   |   |-- button.tsx
|   |   |   |-- card.tsx
|   |   |   |-- container.tsx
|   |   |   |-- empty-state.tsx
|   |   |   |-- input.tsx
|   |   |   |-- page-header.tsx
|   |   |   |-- section-card.tsx
|   |   |   |-- select.tsx
|   |   |   |-- stat.tsx
|   |   |   |-- stepper.tsx
|   |   |   `-- textarea.tsx
|   |   |-- work
|   |   |   |-- review-actions.tsx
|   |   |   `-- submission-form.tsx
|   |   |-- hero.tsx
|   |   |-- site-footer.tsx
|   |   `-- site-header.tsx
|   |-- lib
|   |   |-- creators
|   |   |   `-- filters.ts
|   |   |-- jobs
|   |   |   |-- alerts.ts
|   |   |   |-- filters.ts
|   |   |   `-- visibility.ts
|   |   |-- notifications
|   |   |-- payments
|   |   |   `-- escrow.ts
|   |   |-- profiles
|   |   |   `-- completeness.ts
|   |   |-- telegram
|   |   |   `-- binding.ts
|   |   |-- auth.ts
|   |   |-- authz.ts
|   |   |-- constants.ts
|   |   |-- env.ts
|   |   |-- notifications.ts
|   |   |-- outbox.ts
|   |   |-- password.ts
|   |   |-- payments.ts
|   |   |-- platform-settings.ts
|   |   |-- prisma.ts
|   |   |-- utils.ts
|   |   `-- validators.ts
|   `-- types
|       `-- next-auth.d.ts
|-- .env
|-- .env.example
|-- .env1
|-- .eslintrc.json
|-- .gitignore
|-- .prettierrc
|-- AGENTS.md
|-- CONCEPT.md
|-- docker-compose.yml
|-- LICENSE
|-- middleware.ts
|-- next-env.d.ts
|-- next.config.mjs
|-- package-lock.json
|-- package.json
|-- postcss.config.mjs
|-- README.md
|-- tailwind.config.ts
|-- tsconfig.json
`-- tsconfig.tsbuildinfo
```

## Чего мы уже смогли достичь

- Настроен рабочий MVP на Next.js 14 с App Router, NextAuth (Credentials), Prisma + Postgres, Tailwind и Zod.
- Реализованы роли и доступы (GUEST/CREATOR/BRAND/ADMIN) с middleware и серверными helpers для защиты страниц и API.
- Сформирован основной продуктовый поток: лента заказов, деталь заказа, отклики/инвайты, чат, сдача работ, ревью и завершение сделки.
- Добавлены финансы v1: escrow, ledger, wallet, заявки на выплаты и админ-подтверждения, базовая комиссия платформы.
- Встроены уведомления и outbox-события для внешнего бота, плюс заглушка интеграции с Telegram.
- Подготовлен админ-контур: модерация заказов, верификация креаторов, споры, выплаты, настройки платформы.

## Что мы разработали в целом

- Полноценную структуру доменной модели (профили, заказы, отклики, чат, сдачи, споры, платежи, уведомления, отзывы) с миграциями и сидом.
- Набор публичных страниц (лендинг, каталог заказов и креаторов, публичные профили брендов/креаторов) и приватных кабинетов для разных ролей.
- Набор API-роутов под ключевые действия (регистрация, отклик, инвайт, сообщения, сдача, модерация, выплаты, outbox).
- Библиотечные модули для авторизации, фильтрации, платежей, платформенных настроек и вспомогательных утилит.
- UI-библиотеку базовых компонентов и специализированные формы/карточки для ключевых сценариев.
- Документацию по архитектуре, плану Telegram-бота и симулятору outbox.
