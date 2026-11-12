/// <reference types="vite/client" />

// Injected via vite.config.ts's `define`, from package.json's version — used
// as the React Query persister's cache buster (see src/lib/queryPersist.ts).
declare const __APP_VERSION__: string;
