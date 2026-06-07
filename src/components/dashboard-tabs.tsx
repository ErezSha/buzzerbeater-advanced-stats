"use client";

import { Activity, BarChart3, BookOpen, CalendarDays, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { GamesTabContent } from "@/components/dashboard-tabs/games-tab-content";
import { GlossaryTabContent } from "@/components/dashboard-tabs/glossary-tab-content";
import { OverviewTabContent } from "@/components/dashboard-tabs/overview-tab-content";
import { PlayersTabContent } from "@/components/dashboard-tabs/players-tab-content";
import { TrendsTabContent } from "@/components/dashboard-tabs/trends-tab-content";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DashboardViewModel } from "@/lib/api-types";

interface DashboardTabsProps {
  data: DashboardViewModel | null;
  isLoading: boolean;
}

const TAB_VALUES = ["overview", "players", "games", "trends", "glossary"];
const DEFAULT_TAB = "overview";

function getTabFromUrl(): string {
  if (typeof window === "undefined") return DEFAULT_TAB;
  const tab = new URLSearchParams(window.location.search).get("tab");
  return tab && TAB_VALUES.includes(tab) ? tab : DEFAULT_TAB;
}

export function DashboardTabs({ data, isLoading }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState(DEFAULT_TAB);

  // Read the tab from the URL after hydration. Doing this in an effect (rather than
  // a lazy initializer) keeps the server/client first render identical, avoiding a
  // hydration mismatch when the URL points at a non-default tab.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from browser-only URL state on mount
    setActiveTab(getTabFromUrl());
  }, []);

  // Keep the tab in sync when the user navigates back/forward.
  useEffect(() => {
    const onPopState = () => setActiveTab(getTabFromUrl());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(window.location.search);
    if (value === DEFAULT_TAB) {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`,
    );
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-5">
        <TabsTrigger value="overview">
          <Activity className="h-4 w-4" aria-hidden="true" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="players">
          <Users className="h-4 w-4" aria-hidden="true" />
          Players
        </TabsTrigger>
        <TabsTrigger value="games">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          Games
        </TabsTrigger>
        <TabsTrigger value="trends">
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
          Trends
        </TabsTrigger>
        <TabsTrigger value="glossary">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          Glossary
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <OverviewTabContent data={data} isLoading={isLoading} />
      </TabsContent>

      <TabsContent value="players">
        <PlayersTabContent data={data} isLoading={isLoading} />
      </TabsContent>

      <TabsContent value="games">
        <GamesTabContent data={data} isLoading={isLoading} />
      </TabsContent>

      <TabsContent value="trends">
        <TrendsTabContent data={data} isLoading={isLoading} />
      </TabsContent>

      <TabsContent value="glossary">
        <GlossaryTabContent />
      </TabsContent>
    </Tabs>
  );
}
