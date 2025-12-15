"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoginSlugModal } from "./login-slug-modal";
import { RegisterSlugModal } from "./register-slug-modal";

export function LandingPage() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  return (
    <div className="flex min-h-svh flex-col">
      {/* Hero Section */}
      <section className="flex flex-1 items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-6">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-6 text-5xl font-bold tracking-tight">
            Welcome to CMS
          </h1>
          <p className="mb-8 text-xl text-muted-foreground">
            Manage your club with ease. Get started today.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              onClick={() => setShowLoginModal(true)}
              className="min-w-[200px]"
            >
              Login
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setShowRegisterModal(true)}
              className="min-w-[200px]"
            >
              Get Started
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/30 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-2 text-lg font-semibold">Easy Management</h3>
                <p className="text-sm text-muted-foreground">
                  Manage your club operations from one place.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-2 text-lg font-semibold">
                  Team Collaboration
                </h3>
                <p className="text-sm text-muted-foreground">
                  Invite your team and work together seamlessly.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-2 text-lg font-semibold">
                  Secure & Reliable
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your data is safe with enterprise-grade security.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <LoginSlugModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
      />
      <RegisterSlugModal
        open={showRegisterModal}
        onOpenChange={setShowRegisterModal}
      />
    </div>
  );
}

