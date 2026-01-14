interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  // add more env vars here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

