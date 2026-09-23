import type en from "./locales/en.json";

// Makes t() keys type-checked: a typo fails `tsc -b` instead of rendering
// the raw key at runtime.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof en };
  }
}
