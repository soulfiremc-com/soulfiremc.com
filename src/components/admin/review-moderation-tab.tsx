"use client";

import { ADMIN_REVIEW_PATH } from "@/lib/auth-ui-config";
import {
  ReviewModerationTab,
  ReviewModerationTabLabel,
} from "./review-moderation-panel";

export const reviewModerationAdminTab = {
  id: "reviews",
  path: ADMIN_REVIEW_PATH,
  label: <ReviewModerationTabLabel />,
  component: ReviewModerationTab,
};
