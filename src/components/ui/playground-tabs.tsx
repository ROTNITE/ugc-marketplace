"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function PlaygroundTabs() {
  const [tab, setTab] = useState("overview");

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="overview">Обзор</TabsTrigger>
        <TabsTrigger value="details">Детали</TabsTrigger>
        <TabsTrigger value="settings">Настройки</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <div className="text-ui-sm text-muted-foreground">
          Сводка по активности и ключевым метрикам.
        </div>
      </TabsContent>
      <TabsContent value="details">
        <div className="text-ui-sm text-muted-foreground">
          Детальная информация, структура и блоки.
        </div>
      </TabsContent>
      <TabsContent value="settings">
        <div className="text-ui-sm text-muted-foreground">
          Настройки отображения и предпочтения.
        </div>
      </TabsContent>
    </Tabs>
  );
}
