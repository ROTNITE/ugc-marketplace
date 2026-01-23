"use client";

import { useState } from "react";
import { User } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PlaygroundMenu() {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} align="end">
      <DropdownMenuTrigger asChild>
        <IconButton aria-label="Открыть меню профиля" variant="outline">
          <User className="h-4 w-4" aria-hidden />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Профиль · Креатор</DropdownMenuLabel>
        <DropdownMenuItem>Настройки (заглушка)</DropdownMenuItem>
        <DropdownMenuItem>Уведомления (заглушка)</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Выход (заглушка)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
