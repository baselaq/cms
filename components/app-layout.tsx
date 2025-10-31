"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Notifications } from "@/components/notifications";
import { QuickAdd } from "@/components/quick-add";
import { buttonVariants } from "./ui/button";
import { cn } from "@/lib/utils";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function AppLayout({
  children,
  breadcrumbs,
}: {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}) {
  const pathname = usePathname();

  // Auto-generate breadcrumbs from pathname if not provided
  const autoBreadcrumbs = React.useMemo(() => {
    if (breadcrumbs) return breadcrumbs;

    const segments = pathname.split("/").filter(Boolean);
    const items: BreadcrumbItem[] = [{ label: "Dashboard", href: "/" }];

    let currentPath = "";
    segments.forEach((segment) => {
      currentPath += `/${segment}`;
      items.push({
        label: segment.charAt(0).toUpperCase() + segment.slice(1),
        href: currentPath,
      });
    });

    return items;
  }, [pathname, breadcrumbs]);

  return (
    <SidebarProvider>
      <AppSidebar collapsible="icon" />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                {autoBreadcrumbs.map((item, index) => {
                  const isLast = index === autoBreadcrumbs.length - 1;
                  return (
                    <React.Fragment key={index}>
                      <BreadcrumbItem
                        className={
                          index > 0 && index < autoBreadcrumbs.length - 1
                            ? "hidden md:block"
                            : ""
                        }
                      >
                        {isLast ? (
                          <BreadcrumbPage>{item.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink href={item.href || "#"}>
                            {item.label}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {!isLast && (
                        <BreadcrumbSeparator className="hidden md:block" />
                      )}
                    </React.Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-2">
              <QuickAdd />
              <Notifications />
              <AnimatedThemeToggler
                className={cn(
                  buttonVariants({ variant: "secondary", size: "icon" }),
                  "rounded-full"
                )}
              />
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
