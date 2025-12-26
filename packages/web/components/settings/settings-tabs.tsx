"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSettings } from "./profile-settings";
import { BrandingSettings } from "./branding-settings";
import { BranchesSettings } from "./branches-settings";

export function SettingsTabs() {
  return (
    <Tabs defaultValue="profile" className="space-y-6">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="branding">Branding</TabsTrigger>
        <TabsTrigger value="branches">Branches</TabsTrigger>
      </TabsList>
      <TabsContent value="profile" className="space-y-6">
        <ProfileSettings />
      </TabsContent>
      <TabsContent value="branding" className="space-y-6">
        <BrandingSettings />
      </TabsContent>
      <TabsContent value="branches" className="space-y-6">
        <BranchesSettings />
      </TabsContent>
    </Tabs>
  );
}

