import { useTenant } from "@/contexts/TenantContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function checkSubscriptionStatus(subscription_end_date: string): "active" | "grace" | "expired" {
  const now = new Date();
  const end = new Date(subscription_end_date);
  const diff = (now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24);
  if (now <= end) return "active";
  if (diff <= 3) return "grace";
  return "expired";
}

// Usage example in a route guard or layout:
// const status = checkSubscriptionStatus(user.subscription_end_date);
// if (status === "expired") navigate("/locked");
// if (status === "grace") showBanner = true;
