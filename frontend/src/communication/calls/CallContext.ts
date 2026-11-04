import { createContext, useContext } from "react";
import type { useCallController } from "./useCallController";

export const CallContext = createContext<ReturnType<typeof useCallController> | null>(null);
export const useCalls = () => useContext(CallContext);
