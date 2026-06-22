"use client";

import { useEffect, useRef, useState } from "react";
import "driver.js/dist/driver.css";
import { completeTourAction, skipTourAction } from "@/actions/onboarding";
import type { TourId } from "@/lib/onboarding";
import { TOUR_STEPS, ADMIN_TOUR_TRANSITIONS } from "@/lib/tour-steps";

type Props = {
  tourId: TourId;
  initialVisible?: boolean;
};

function switchWorkspace(ws: string) {
  window.dispatchEvent(new CustomEvent("nexora:switch-workspace", { detail: ws }));
}

export function OnboardingTour({ tourId, initialVisible = true }: Props) {
  const [running, setRunning] = useState(false);
  const completedRef = useRef(false);
  const startedRef = useRef(false);

  async function startTour() {
    if (running) return;
    setRunning(true);
    completedRef.current = false;

    // Admin tour always starts from EAD workspace
    if (tourId === "admin") {
      switchWorkspace("ead");
      await new Promise((r) => setTimeout(r, 100));
    }

    const { driver } = await import("driver.js");
    const steps = TOUR_STEPS[tourId];
    const lastIdx = steps.length - 1;

    const { switchToSecretaria, switchToAdministracao } = ADMIN_TOUR_TRANSITIONS;

    const driverObj = driver({
      showProgress: true,
      progressText: "{{current}} de {{total}}",
      nextBtnText: "Próximo →",
      prevBtnText: "← Anterior",
      doneBtnText: "Entendido! ✓",
      allowClose: true,
      smoothScroll: true,
      animate: true,
      overlayOpacity: 0.55,
      stagePadding: 6,
      stageRadius: 8,
      popoverClass: "nexora-tour-popover",
      steps,

      onNextClick: () => {
        const idx = driverObj.getActiveIndex() ?? 0;

        if (tourId === "admin" && idx === switchToSecretaria) {
          switchWorkspace("secretaria");
          setTimeout(() => driverObj.moveNext(), 250);
          return;
        }
        if (tourId === "admin" && idx === switchToAdministracao) {
          switchWorkspace("administracao");
          setTimeout(() => driverObj.moveNext(), 250);
          return;
        }
        if (idx === lastIdx) {
          completedRef.current = true;
          driverObj.destroy();
          return;
        }
        driverObj.moveNext();
      },

      onPrevClick: () => {
        const idx = driverObj.getActiveIndex() ?? 0;

        if (tourId === "admin" && idx === switchToSecretaria + 1) {
          switchWorkspace("ead");
          setTimeout(() => driverObj.movePrevious(), 250);
          return;
        }
        if (tourId === "admin" && idx === switchToAdministracao + 1) {
          switchWorkspace("secretaria");
          setTimeout(() => driverObj.movePrevious(), 250);
          return;
        }
        driverObj.movePrevious();
      },

      onDestroyed: () => {
        setRunning(false);
        if (completedRef.current) {
          void completeTourAction(tourId);
        } else {
          void skipTourAction(tourId);
        }
      },
    });

    driverObj.drive();
  }

  useEffect(() => {
    if (initialVisible && !startedRef.current) {
      startedRef.current = true;
      void startTour();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      onClick={() => void startTour()}
      disabled={running}
      className="fixed bottom-[6rem] right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-2xl ring-2 ring-white hover:from-violet-400 hover:to-indigo-500 hover:scale-110 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-violet-400/50 disabled:opacity-50"
      aria-label="Abrir guia de boas-vindas"
      title="Ajuda / Tour"
    >
      <span className="text-2xl font-extrabold leading-none select-none drop-shadow">?</span>
    </button>
  );
}
