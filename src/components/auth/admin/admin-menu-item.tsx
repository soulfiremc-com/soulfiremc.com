"use client";

import type { AdminAuthClient } from "@better-auth-ui/core/plugins/admin";
import { useAuth } from "@better-auth-ui/react";
import { useAdminPermission } from "@better-auth-ui/react/plugins/admin";
import { ShieldCheck } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function AdminMenuItem() {
  const { authClient, basePaths, navigate, viewPaths } =
    useAuth<AdminAuthClient>();
  const permission = useAdminPermission(authClient, { user: ["list"] });

  if (permission.data?.success !== true) {
    return null;
  }

  return (
    <DropdownMenuItem
      onClick={() =>
        navigate({
          to: `${basePaths.admin}/${viewPaths.admin.users}`,
        })
      }
    >
      <ShieldCheck className="text-muted-foreground" />
      Administration
    </DropdownMenuItem>
  );
}
