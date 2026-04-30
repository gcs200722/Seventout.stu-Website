"use client";

import { useEffect } from "react";

export function PlatformLandingClientEffects() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        }
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px",
      },
    );

    const revealElements = document.querySelectorAll(".platform-landing .reveal");
    revealElements.forEach((element) => observer.observe(element));

    const scrollContainer = document.querySelector<HTMLElement>(".platform-landing .no-scrollbar");
    const wheelHandler = (event: WheelEvent) => {
      if (window.innerWidth > 1024) {
        event.preventDefault();
        scrollContainer.scrollLeft += event.deltaY;
      }
    };
    scrollContainer?.addEventListener("wheel", wheelHandler, { passive: false });

    return () => {
      revealElements.forEach((element) => observer.unobserve(element));
      observer.disconnect();
      scrollContainer?.removeEventListener("wheel", wheelHandler);
    };
  }, []);

  return null;
}
