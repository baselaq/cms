"use client";

import * as React from "react";
import {
  DashboardSquare01Icon,
  UserGroup02Icon,
  Calendar01Icon,
  Chat01Icon,
  BookOpen01Icon,
  CalendarCheckIn01Icon,
  Building01Icon,
  Settings01Icon,
  ChartIcon,
} from "@hugeicons/core-free-icons";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { TeamSwitcher } from "./team-switcher";

// This is sample data for CMS.
const data = {
  user: {
    name: "Admin User",
    email: "admin@cms.example",
    avatar: "/avatars/admin.jpg",
  },
  teams: [
    {
      name: "CMS Production",
      logo: DashboardSquare01Icon,
      plan: "Enterprise",
    },
    {
      name: "CMS Development",
      logo: ChartIcon,
      plan: "Staging",
    },
    {
      name: "Personal Workspace",
      logo: UserGroup02Icon,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Start",
      url: "/",
      icon: DashboardSquare01Icon,
      isActive: true,
    },
    {
      title: "Team",
      url: "/team",
      icon: UserGroup02Icon,
    },
    {
      title: "Calendar",
      url: "/calendar",
      icon: Calendar01Icon,
    },
    {
      title: "Communication",
      url: "/communication",
      icon: Chat01Icon,
      items: [
        {
          title: "Chat",
          url: "/communication/chat",
        },
        {
          title: "Wall / Posts",
          url: "/communication/wall",
        },
      ],
    },
    {
      title: "Development",
      url: "/development",
      icon: BookOpen01Icon,
      items: [
        {
          title: "Training Library",
          url: "/development/training",
        },
        {
          title: "Performance",
          url: "/development/performance",
        },
        {
          title: "Videos",
          url: "/development/videos",
        },
      ],
    },
    {
      title: "Scheduling",
      url: "/scheduling",
      icon: CalendarCheckIn01Icon,
      items: [
        {
          title: "Bookings",
          url: "/scheduling/bookings",
        },
        {
          title: "Templates",
          url: "/scheduling/templates",
        },
        {
          title: "Resources",
          url: "/scheduling/resources",
        },
      ],
    },
    {
      title: "Administration",
      url: "/administration",
      icon: Building01Icon,
      items: [
        {
          title: "Organization",
          url: "/administration/organization",
        },
        {
          title: "Contacts",
          url: "/administration/contacts",
        },
        {
          title: "Products / Services",
          url: "/administration/products",
        },
        {
          title: "Payments",
          url: "/administration/payments",
        },
        {
          title: "Registrations",
          url: "/administration/registrations",
        },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings01Icon,
      items: [
        {
          title: "Club Settings",
          url: "/settings/club",
        },
        {
          title: "Integrations",
          url: "/settings/integrations",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
