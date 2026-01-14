declare module "react-i18next" {
  import * as React from "react";

  export interface UseTranslationResponse {
    t: (key: string, options?: Record<string, unknown>) => string;
    i18n: {
      language: string;
      changeLanguage: (lng: string) => Promise<void>;
    };
  }

  export function useTranslation(): UseTranslationResponse;

  export const I18nextProvider: React.FC<{ i18n: any; children?: React.ReactNode }>;
}

