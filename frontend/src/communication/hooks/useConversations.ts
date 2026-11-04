import { useCallback, useEffect, useState } from "react";
import { communicationApi } from "../api/communicationApi";
import { communicationClosed, communicationError } from "../api/communicationErrors";
import type { Conversation } from "../types";

interface Snapshot { userId: string; items: Conversation[]; error: string; blocked: boolean; directError: string }
export function useConversations(userId: string | undefined, clinical = true) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [revision, setRevision] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const reload = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    if (!userId) return () => controller.abort();
    async function load() {
      if (pending || document.visibilityState === "hidden") return;
      pending = true; setRefreshing(true);
      const [consultations, direct] = await Promise.allSettled([
        clinical ? communicationApi.list(controller.signal) : Promise.resolve([]), communicationApi.listDirect(controller.signal),
      ]);
      if (!controller.signal.aborted) {
        const blocked = consultations.status === "rejected" && communicationClosed(consultations.reason);
        setSnapshot((previous) => {
          const old = previous && previous.userId === userId ? previous.items : [];
          const clinicalItems = consultations.status === "fulfilled" ? consultations.value : blocked ? [] : old.filter((item) => !item.id.startsWith("direct:"));
          const directBlocked = direct.status === "rejected" && communicationClosed(direct.reason);
          const directItems = direct.status === "fulfilled" ? direct.value : directBlocked ? [] : old.filter((item) => item.id.startsWith("direct:"));
          return { userId: userId!, items: [...clinicalItems, ...directItems].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
            blocked, error: consultations.status === "rejected" ? communicationError(consultations.reason) : "",
            directError: direct.status === "rejected" ? "Additional messaging is unavailable. Try refreshing." : "" };
        });
        setRefreshing(false);
      }
      pending = false;
    }
    void load();
    const timer = window.setInterval(() => void load(), 10000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [userId, revision, clinical]);
  const current = snapshot?.userId === userId ? snapshot : null;
  return { items: current?.items ?? [], loading: Boolean(userId) && !current, refreshing,
    error: current?.error ?? "", directError: current?.directError ?? "", blocked: current?.blocked ?? false, reload };
}
