import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { isFalloffTrackablePath, recordTrackedPageView, startFalloffSessionTracking } from "@/lib/checkoutTracking";

export default function FalloffSessionTracker() {
  const location = useLocation();
  const trackable = isFalloffTrackablePath(location.pathname);

  useEffect(() => {
    if (!trackable) return;
    return startFalloffSessionTracking();
  }, [trackable]);

  useEffect(() => {
    if (!trackable) return;
    void recordTrackedPageView();
  }, [location.pathname, trackable]);

  return null;
}
