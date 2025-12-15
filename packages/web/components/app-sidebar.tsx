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
} from "@hugeicons/core-free-icons";

import { NavMain, type NavItem } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { TeamSwitcher } from "./team-switcher";
import { useAuth } from "@/hooks/use-auth";

// Menu item with permission requirements
type NavItemWithPermissions = NavItem & {
  requiredPermission?: string; // e.g., "team.read"
  requiredRole?: string; // e.g., "Admin"
  items?: (NavItem & {
    requiredPermission?: string;
    requiredRole?: string;
  })[];
};

const allNavItems: NavItemWithPermissions[] = [
  {
    title: "Start",
    url: "/dashboard/overview",
    icon: DashboardSquare01Icon,
    isActive: true,
  },
  {
    title: "Team",
    url: "/team",
    icon: UserGroup02Icon,
    requiredPermission: "team.read",
  },
  {
    title: "Calendar",
    url: "/calendar",
    icon: Calendar01Icon,
    requiredPermission: "calendar.read",
  },
  {
    title: "Communication",
    url: "/communication",
    icon: Chat01Icon,
    requiredPermission: "communication.read",
    items: [
      {
        title: "Chat",
        url: "/communication/chat",
        requiredPermission: "communication.read",
      },
      {
        title: "Wall / Posts",
        url: "/communication/wall",
        requiredPermission: "communication.read",
      },
    ],
  },
  {
    title: "Development",
    url: "/development",
    icon: BookOpen01Icon,
    requiredPermission: "development.read",
    items: [
      {
        title: "Training Library",
        url: "/development/training",
        requiredPermission: "development.read",
      },
      {
        title: "Performance",
        url: "/development/performance",
        requiredPermission: "development.read",
      },
      {
        title: "Videos",
        url: "/development/videos",
        requiredPermission: "development.read",
      },
    ],
  },
  {
    title: "Scheduling",
    url: "/scheduling",
    icon: CalendarCheckIn01Icon,
    requiredPermission: "scheduling.read",
    items: [
      {
        title: "Bookings",
        url: "/scheduling/bookings",
        requiredPermission: "scheduling.read",
      },
      {
        title: "Templates",
        url: "/scheduling/templates",
        requiredPermission: "scheduling.read",
      },
      {
        title: "Resources",
        url: "/scheduling/resources",
        requiredPermission: "scheduling.read",
      },
    ],
  },
  {
    title: "Administration",
    url: "/administration",
    icon: Building01Icon,
    requiredRole: "Admin", // Only Admin role can access
    items: [
      {
        title: "Organization",
        url: "/administration/organization",
        requiredRole: "Admin",
      },
      {
        title: "Contacts",
        url: "/administration/contacts",
        requiredRole: "Admin",
      },
      {
        title: "Products / Services",
        url: "/administration/products",
        requiredRole: "Admin",
      },
      {
        title: "Payments",
        url: "/administration/payments",
        requiredRole: "Admin",
      },
      {
        title: "Registrations",
        url: "/administration/registrations",
        requiredRole: "Admin",
      },
    ],
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings01Icon,
    requiredPermission: "settings.read",
    items: [
      {
        title: "Club Settings",
        url: "/settings/club",
        requiredPermission: "settings.read",
      },
      {
        title: "Integrations",
        url: "/settings/integrations",
        requiredPermission: "settings.read",
      },
    ],
  },
];

const teams = [
  {
    id: "1",
    name: "Club 1",
    logo: UserGroup02Icon,
    plan: "Free",
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { hasPermission, hasRole, user, isLoading } = useAuth();

  // Filter menu items based on permissions and roles
  const filteredNavItems = React.useMemo(() => {
    // Don't filter if still loading or user not authenticated
    if (isLoading || !user) {
      return [];
    }

    return allNavItems
      .map((item) => {
        // Check if user has access to this item
        // Item is accessible if:
        // 1. No permission/role required, OR
        // 2. User has required permission (if specified), AND
        // 3. User has required role (if specified)
        const hasItemAccess =
          (!item.requiredPermission ||
            hasPermission(item.requiredPermission)) &&
          (!item.requiredRole || hasRole(item.requiredRole));

        if (!hasItemAccess) {
          return null;
        }

        // Filter sub-items
        const filteredSubItems = item.items
          ? item.items.filter(
              (
                subItem: NavItem & {
                  requiredPermission?: string;
                  requiredRole?: string;
                }
              ) => {
                return (
                  (!subItem.requiredPermission ||
                    hasPermission(subItem.requiredPermission)) &&
                  (!subItem.requiredRole || hasRole(subItem.requiredRole))
                );
              }
            )
          : undefined;

        // If item has sub-items but none are accessible, hide the parent too
        if (item.items && filteredSubItems?.length === 0) {
          return null;
        }

        return {
          ...item,
          items: filteredSubItems,
        } as NavItemWithPermissions;
      })
      .filter((item): item is NavItemWithPermissions => item !== null);
  }, [hasPermission, hasRole, user, isLoading]);

  const displayUser = user
    ? {
        name:
          `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        email: user.email,
        avatar: "/avatars/admin.jpg",
      }
    : {
        name: "Guest",
        email: "",
        avatar: "/avatars/admin.jpg",
      };

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavItems as unknown as typeof allNavItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={displayUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
