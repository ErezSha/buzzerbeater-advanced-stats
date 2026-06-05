"use client";

import { Activity, BarChart3, BookOpen, CalendarDays, Users } from "lucide-react";
import { GamesTabContent } from "@/components/dashboard-tabs/games-tab-content";
import { GlossaryTabContent } from "@/components/dashboard-tabs/glossary-tab-content";
import { OverviewTabContent } from "@/components/dashboard-tabs/overview-tab-content";
import { PlayersTabContent } from "@/components/dashboard-tabs/players-tab-content";
import { TrendsTabContent } from "@/components/dashboard-tabs/trends-tab-content";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DashboardTabs() {
  return (
    <Tabs defaultValue="overview" className="w-full">
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
        <OverviewTabContent />
      </TabsContent>

      <TabsContent value="players">
        <PlayersTabContent />
      </TabsContent>

      <TabsContent value="games">
        <GamesTabContent />
      </TabsContent>

      <TabsContent value="trends">
        <TrendsTabContent />
      </TabsContent>

      <TabsContent value="glossary">
        <GlossaryTabContent />
      </TabsContent>
    </Tabs>
  );
}
