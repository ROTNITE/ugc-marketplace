"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DealsTab = {
  id: string;
  label: string;
  count: number;
};

type DealsTabsProps = {
  tabs: DealsTab[];
  activeTab: string;
  className?: string;
};

export function DealsTabs({ tabs, activeTab, className }: DealsTabsProps) {
  const router = useRouter();
  const [value, setValue] = React.useState(activeTab);

  React.useEffect(() => {
    setValue(activeTab);
  }, [activeTab]);

  function handleChange(nextValue: string) {
    setValue(nextValue);
    router.push(`/dashboard/deals?tab=${nextValue}`);
  }

  return (
    <Tabs value={value} onValueChange={handleChange} className={className}>
      <TabsList className={cn("flex flex-wrap gap-2 bg-transparent border-0 p-0", className)}>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2 rounded-full px-3 py-1">
            {tab.label}
            <Badge variant="soft">{tab.count}</Badge>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
