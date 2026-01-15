export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} UGC Marketplace (skeleton)</p>
          <p className="text-xs">
            MVP-скелет. Дальше будем улучшать дизайн, фильтры, чаты, эскроу и модерацию.
          </p>
        </div>
      </div>
    </footer>
  );
}
