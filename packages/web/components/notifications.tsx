"use client";

import * as React from "react";
import {
  Notification01Icon,
  Chat01Icon,
  UserAdd01Icon,
  Folder01Icon,
  UserGroup02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type Notification = {
  title: string;
  description: string;
  time: string;
  icon: IconSvgElement;
  read: boolean;
};

const notifications: Notification[] = [
  {
    title: "New comment on post",
    description: "John Doe commented on your latest post",
    time: "2 minutes ago",
    icon: Chat01Icon,
    read: false,
  },
  {
    title: "New follower",
    description: "Sarah Smith started following you",
    time: "1 hour ago",
    icon: UserAdd01Icon,
    read: false,
  },
  {
    title: "Project update",
    description: "The CMS project has been updated",
    time: "3 hours ago",
    icon: Folder01Icon,
    read: false,
  },
  {
    title: "Team invitation",
    description: "You've been invited to join the Design team",
    time: "1 day ago",
    icon: UserGroup02Icon,
    read: true,
  },
];

export function Notifications() {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="relative rounded-full"
        >
          <HugeiconsIcon icon={Notification01Icon} size={24} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[350px]">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-center">
              <div className="text-muted-foreground">
                <HugeiconsIcon
                  icon={Notification01Icon}
                  size={48}
                  className="mx-auto opacity-20"
                />
                <p className="mt-4 text-sm">No notifications</p>
              </div>
            </div>
          ) : (
            <div className="py-2">
              {notifications.map((notification, index) => (
                <DropdownMenuItem
                  key={index}
                  className={`flex gap-3 py-3 px-4 cursor-pointer ${
                    notification.read ? "" : "bg-accent"
                  }`}
                >
                  <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
                    <div className="font-medium text-sm w-full flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`mt-0.5 shrink-0 ${
                            notification.read
                              ? "text-muted-foreground"
                              : "text-primary"
                          }`}
                        >
                          <HugeiconsIcon icon={notification.icon} size={20} />
                        </div>
                        <span className="flex-1">{notification.title}</span>
                      </div>
                      {!notification.read && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {notification.description}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {notification.time}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-center justify-center">
              View all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
