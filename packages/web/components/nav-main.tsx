"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export type NavItem = {
  title: string;
  url: string;
  icon?: IconSvgElement;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
  }[];
};

type NavGroup = {
  title?: string;
  items: NavItem[];
};

export function NavMain({
  items,
  groups,
}: {
  items?: NavItem[];
  groups?: NavGroup[];
}) {
  const pathname = usePathname();

  const renderNavItem = (item: NavItem) => {
    const isActive =
      item.url === "/"
        ? pathname === "/"
        : pathname === item.url || pathname.startsWith(`${item.url}/`);
    const hasActiveChild = item.items?.some(
      (subItem) =>
        pathname === subItem.url || pathname.startsWith(`${subItem.url}/`)
    );

    if (!item.items) {
      return (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild isActive={isActive}>
            <Link href={item.url}>
              {item.icon && <HugeiconsIcon icon={item.icon} size={16} />}
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }

    return (
      <Collapsible
        key={item.title}
        asChild
        defaultOpen={item.isActive || isActive || hasActiveChild}
        className="group/collapsible"
      >
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={item.title} isActive={isActive}>
              {item.icon && <HugeiconsIcon icon={item.icon} size={16} />}
              <span>{item.title}</span>
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          {item.items && (
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.items?.map((subItem) => {
                  const isSubItemActive =
                    pathname === subItem.url ||
                    pathname.startsWith(`${subItem.url}/`);
                  return (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton asChild isActive={isSubItemActive}>
                        <Link href={subItem.url}>
                          <span>{subItem.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            </CollapsibleContent>
          )}
        </SidebarMenuItem>
      </Collapsible>
    );
  };

  return (
    <>
      {/* Render ungrouped items first */}
      {items && items.length > 0 && (
        <SidebarGroup>
          <SidebarMenu>{items.map(renderNavItem)}</SidebarMenu>
        </SidebarGroup>
      )}

      {/* Then render grouped items */}
      {groups && groups.length > 0 && (
        <>
          {groups.map((group, groupIndex) => (
            <SidebarGroup key={group.title || `group-${groupIndex}`}>
              {group.title && (
                <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              )}
              <SidebarMenu>{group.items.map(renderNavItem)}</SidebarMenu>
            </SidebarGroup>
          ))}
        </>
      )}
    </>
  );
}
