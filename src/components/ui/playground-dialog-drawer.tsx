"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

export function PlaygroundDialogDrawer() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-3">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary">Открыть модалку</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтверждение действия</DialogTitle>
            <DialogDescription>
              Минимальный модал с токенами, без сложной логики.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 text-ui-sm text-muted-foreground">
            Здесь может быть текст, формы или предпросмотр.
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Отмена</Button>
            </DialogClose>
            <Button>Подтвердить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerTrigger asChild>
          <Button variant="outline">Открыть drawer</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Меню фильтров</DrawerTitle>
            <DrawerDescription>Мок‑контент в виде дровера.</DrawerDescription>
          </DrawerHeader>
          <DrawerBody className="space-y-3">
            <div className="rounded-md border border-border-soft bg-card px-3 py-2 text-ui-sm">
              Быстрый фильтр 1
            </div>
            <div className="rounded-md border border-border-soft bg-card px-3 py-2 text-ui-sm">
              Быстрый фильтр 2
            </div>
            <div className="rounded-md border border-border-soft bg-card px-3 py-2 text-ui-sm">
              Быстрый фильтр 3
            </div>
          </DrawerBody>
          <DrawerFooter className="flex items-center justify-between">
            <DrawerClose asChild>
              <Button variant="ghost">Закрыть</Button>
            </DrawerClose>
            <Button>Применить</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
