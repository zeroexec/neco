"use client";

import { useSyncExternalStore } from "react";

/**
 * Melacak keyboard virtual di HP lewat visualViewport.
 * - inset  : tinggi keyboard (px), 0 bila keyboard tertutup
 * - height : tinggi area yang terlihat saat keyboard terbuka, 0 bila tertutup
 *
 * Satu listener bersama untuk semua komponen, di-throttle dengan requestAnimationFrame,
 * dan hanya memberi tahu komponen bila nilainya benar-benar berubah. Perubahan kecil
 * (mis. address bar browser yang mengecil) diabaikan sehingga tidak memicu render ulang.
 */
type KeyboardState = { inset: number; height: number };

const CLOSED: KeyboardState = { inset: 0, height: 0 };
let snapshot: KeyboardState = CLOSED;
const listeners = new Set<() => void>();
let raf = 0;

function compute(): KeyboardState {
  const vv = window.visualViewport;
  if (!vv) return CLOSED;

  const el = document.activeElement;
  const editing =
    el instanceof HTMLElement &&
    (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
  const zoomed = vv.scale > 1.01; // pinch-zoom bukan keyboard
  const raw = Math.round(window.innerHeight - vv.height - vv.offsetTop);

  if (!editing || zoomed || raw < 80) return CLOSED;
  return { inset: raw, height: Math.round(vv.height) };
}

function update() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    const next = compute();
    if (next.inset !== snapshot.inset || next.height !== snapshot.height) {
      snapshot = next;
      listeners.forEach((l) => l());
    }
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (listeners.size === 1) {
    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("focusin", update);
    window.addEventListener("focusout", update);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) {
      const vv = window.visualViewport;
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("focusin", update);
      window.removeEventListener("focusout", update);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      snapshot = CLOSED;
    }
  };
}

export function useKeyboardInset(): KeyboardState {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => CLOSED
  );
}