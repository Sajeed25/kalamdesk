"use client";
import { useEffect, useState } from "react";

/** A slim bar that appears when the phone loses its connection, so people know saves will not go through. */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[60] bg-amber-500 px-4 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] text-center text-sm font-bold text-black">
      You are offline. Changes will not save until you are back online.
    </div>
  );
}
