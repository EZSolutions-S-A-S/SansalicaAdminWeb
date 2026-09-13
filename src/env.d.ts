/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly BACKEND_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    /** Display-only name cache for the sidebar greeting — not an auth source. */
    user: { name: string | null };
  }
}
