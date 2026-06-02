/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_QUOTE_PROVIDER?: 'mock' | 'real'
  readonly VITE_QUOTE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
