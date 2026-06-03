"use client";

import * as React from "react";
import type { ToastProps } from "../components/toast";

type ToastData = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
};

type ToastInput = Omit<ToastData, "id">;

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 4000;

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type State = { toasts: ToastData[] };
type Action =
  | { type: "ADD"; toast: ToastData }
  | { type: "DISMISS"; toastId?: string }
  | { type: "REMOVE"; toastId?: string };

const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((l) => l(memoryState));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD":
      return { toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT) };
    case "DISMISS": {
      const { toastId } = action;
      if (toastId) {
        scheduleRemove(toastId);
      } else {
        state.toasts.forEach((t) => scheduleRemove(t.id));
      }
      return { toasts: state.toasts.map((t) => (toastId === undefined || t.id === toastId ? { ...t, open: false } : t)) };
    }
    case "REMOVE":
      return { toasts: action.toastId ? state.toasts.filter((t) => t.id !== action.toastId) : [] };
  }
}

function scheduleRemove(toastId: string) {
  if (toastTimeouts.has(toastId)) return;
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: "REMOVE", toastId });
  }, TOAST_REMOVE_DELAY);
  toastTimeouts.set(toastId, timeout);
}

function toast(props: ToastInput) {
  const id = genId();
  dispatch({ type: "ADD", toast: { ...props, id, open: true, onOpenChange: (open) => { if (!open) dispatch({ type: "DISMISS", toastId: id }); } } });
  return { id, dismiss: () => dispatch({ type: "DISMISS", toastId: id }) };
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);
  React.useEffect(() => {
    listeners.push(setState);
    return () => { const i = listeners.indexOf(setState); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return { ...state, toast, dismiss: (id?: string) => dispatch({ type: "DISMISS", toastId: id }) };
}

export { useToast, toast };
