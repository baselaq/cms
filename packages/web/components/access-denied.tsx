"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LockKeyIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface AccessDeniedProps {
  title?: string;
  message?: string;
  showHomeButton?: boolean;
  onActionClick?: () => void;
  actionButtonText?: string;
}

export function AccessDenied({
  title = "Access Denied",
  message = "You do not have the necessary permissions to view this content.",
  showHomeButton = true,
  onActionClick,
  actionButtonText = "Go to Home",
}: AccessDeniedProps) {
  const router = useRouter();

  const handleAction = () => {
    if (onActionClick) {
      onActionClick();
    } else {
      router.push("/");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8 bg-white shadow-lg rounded-lg max-w-md">
        <HugeiconsIcon
          icon={LockKeyIcon}
          className="mx-auto h-16 w-16 text-red-500 mb-4"
        />
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{title}</h1>
        <p className="text-gray-600 mb-6">{message}</p>
        {showHomeButton && (
          <button
            onClick={handleAction}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {actionButtonText}
          </button>
        )}
      </div>
    </div>
  );
}
