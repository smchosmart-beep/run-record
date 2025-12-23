import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Service worker는 번들 캐시로 인해 React 중복 로딩/Invalid hook call을 유발할 수 있어 비활성화합니다.
// (필요 시 Workbox/Vite-PWA로 올바르게 설정한 뒤 다시 활성화 권장)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });

  if ("caches" in window) {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
