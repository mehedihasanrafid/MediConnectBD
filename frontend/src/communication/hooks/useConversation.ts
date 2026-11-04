import { useEffect, useMemo, useRef, useState } from "react";
import { communicationApi } from "../api/communicationApi";
import { communicationClosed, communicationError, isCommunicationExpiry } from "../api/communicationErrors";
import { canCompose, type ChatMessage, type Conversation } from "../types";

interface Snapshot {
  generation: object; conversation: Conversation | null; messages: ChatMessage[]; error: string; nextCursor: string | null; expanded: boolean;
}
const merge = (older: ChatMessage[], newer: ChatMessage[]) =>
  [...new Map([...older, ...newer].map((message) => [message.id, message])).values()]
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));

export function useConversation(id: string | null, onUpdated?: () => void) {
  const generation = useMemo(() => ({ id }), [id]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [sending, setSending] = useState(false), [refreshing, setRefreshing] = useState(false);
  const [failure, setFailure] = useState<{ generation: object; message: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const active = useRef<object | null>(null);
  const retry = useRef<{ id: string; text: string; key: string } | null>(null);
  const [olderError, setOlderError] = useState(""), [olderBusy, setOlderBusy] = useState(false);
  const sendLock = useRef(false), updated = useRef(onUpdated);
  useEffect(() => { updated.current = onUpdated; }, [onUpdated]);
  useEffect(() => {
    active.current = generation;
    const controller = new AbortController();
    let pending = false;
    let announced = false;
    async function load() {
      if (!id || pending || document.visibilityState === "hidden") return;
      pending = true; setRefreshing(true);
      try {
        const [conversation, page] = await Promise.all([communicationApi.detail(id, controller.signal), communicationApi.messages(id, controller.signal)]);
        if (!controller.signal.aborted) {
          setSnapshot((previous) => {
            const old = previous?.generation === generation ? previous : null;
            return { generation, conversation, messages: merge(old?.messages ?? [], page.items), error: "",
              expanded: old?.expanded ?? false, nextCursor: old?.expanded ? old.nextCursor : page.nextCursor };
          });
          if (!announced) { announced = true; updated.current?.(); }
        }
      } catch (error) {
        if (!controller.signal.aborted) setSnapshot((previous) => {
          const keep = previous?.generation === generation && !communicationClosed(error);
          return { generation, conversation: keep ? previous.conversation : null, messages: keep ? previous.messages : [],
            error: communicationError(error), nextCursor: keep ? previous.nextCursor : null, expanded: keep ? previous.expanded : false };
        });
      } finally { pending = false; if (!controller.signal.aborted) setRefreshing(false); }
    }
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => { controller.abort(); active.current = null; clearInterval(timer); };
  }, [id, generation, revision]);
  const current = snapshot?.generation === generation ? snapshot : null;
  const conversation = current?.conversation ?? null;
  async function send(text: string): Promise<boolean> {
    if (!id || !canCompose(conversation) || sendLock.current) return false;
    const target = generation;
    sendLock.current = true; setSending(true); setFailure(null);
    try {
      if (!retry.current || retry.current.id !== id || retry.current.text !== text) retry.current = { id, text, key: crypto.randomUUID() };
      const message = await communicationApi.send(id, text, retry.current.key);
      retry.current = null;
      if (active.current === target) {
        setSnapshot((previous) => previous?.generation === target ? { ...previous, messages: merge(previous.messages, [message]) } : previous);
        updated.current?.();
      }
      return true;
    } catch (error) {
      if (active.current === target) {
        setFailure({ generation: target, message: communicationError(error) });
        if (communicationClosed(error)) setSnapshot((previous) => previous?.generation === target ? {
          ...previous, messages: isCommunicationExpiry(error) ? previous.messages : [],
          conversation: previous.conversation && { ...previous.conversation, canSend: false,
            communicationState: isCommunicationExpiry(error) ? "EXPIRED" : "UNAVAILABLE", unavailableReason: communicationError(error) },
        } : previous);
      }
      return false;
    } finally { sendLock.current = false; setSending(false); }
  }
  async function loadOlder() {
    if (!id || !current?.nextCursor || olderBusy) return;
    const target = generation;
    setOlderBusy(true); setOlderError("");
    try {
      const page = await communicationApi.messages(id, undefined, current.nextCursor);
      if (active.current === target) setSnapshot((previous) => previous?.generation === target ? {
        ...previous, expanded: true, nextCursor: page.nextCursor, messages: merge(page.items, previous.messages),
      } : previous);
    } catch (error) { if (active.current === target) setOlderError(communicationError(error)); }
    finally { setOlderBusy(false); }
  }
  return { conversation, olderError, loadOlder, olderBusy, hasOlder: Boolean(current?.nextCursor), messages: current?.messages ?? [],
    loading: Boolean(id) && !current, refreshing, sending, error: current?.error ?? "",
    sendError: failure?.generation === generation ? failure.message : "", send,
    reload: () => { setFailure(null); setRevision((n) => n + 1); } };
}
