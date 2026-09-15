import { defineConfig } from "orval";

export default defineConfig({
  warcabownik: {
    input: "http://localhost:3000/api-json",
    output: {
      mode: "tags-split",
      target: "src/api/endpoints",
      schemas: "src/api/models",
      client: "react-query",
      override: {
        mutator: {
          path: "src/api/custom-instance.ts",
          name: "customInstance",
        },
      },
    },
  },
});
