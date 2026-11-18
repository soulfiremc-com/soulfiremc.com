"use client";

import { MessageSquareText } from "lucide-react";
import { ADMIN_REVIEW_PATH } from "@/lib/auth-ui-config";
import { ReviewModerationTab } from "./review-moderation-panel";

export const reviewModerationAdminTab = {
  id: "reviews",
  path: ADMIN_REVIEW_PATH,
  label: (
    <span className="inline-flex items-center gap-1">
      <MessageSquareText className="text-muted-foreground" />
      Reviews
    </span>
  ),
  component: ReviewModerationTab,
};
