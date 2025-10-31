"use client";

import * as React from "react";
import Link from "next/link";
import {
  Add01Icon,
  Chat01Icon,
  CalendarAdd01Icon,
  UserAdd01Icon,
  RegisterIcon,
  FolderAddIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type QuickAddItem = {
  title: string;
  url: string;
  icon: IconSvgElement;
  description: string;
  shortcut?: string;
};

const quickAddItems: QuickAddItem[] = [
  {
    title: "New Post",
    url: "/communication/wall/new",
    icon: Chat01Icon,
    description: "Create a new wall post",
    shortcut: "N",
  },
  {
    title: "New Event",
    url: "/calendar/new",
    icon: CalendarAdd01Icon,
    description: "Schedule a new event",
    shortcut: "E",
  },
  {
    title: "Add Member",
    url: "/team/new",
    icon: UserAdd01Icon,
    description: "Invite a new team member",
    shortcut: "M",
  },
  {
    title: "New Booking",
    url: "/scheduling/bookings/new",
    icon: RegisterIcon,
    description: "Create a new booking",
    shortcut: "B",
  },
  {
    title: "New Project",
    url: "/projects/new",
    icon: FolderAddIcon,
    description: "Start a new project",
    shortcut: "P",
  },
];

export function QuickAdd() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="default" size="icon" className="relative rounded-full">
          <HugeiconsIcon icon={Add01Icon} size={24} />
          <span className="sr-only">Quick add</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[400px]">
        <div className="mb-2">
          <h4 className="font-medium leading-none">Quick Add</h4>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {quickAddItems.map((item) => (
            <Link
              key={item.title}
              href={item.url}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <HugeiconsIcon
                  icon={item.icon}
                  size={24}
                  className="text-primary"
                />
              </div>
              <div className="text-center">
                <div className="font-medium text-sm">{item.title}</div>
                <div className="text-muted-foreground text-xs">
                  {item.description}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
