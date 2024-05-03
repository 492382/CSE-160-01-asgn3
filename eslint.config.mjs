import js from "@eslint/js";
import globals from "globals";
export default [
  js.configs.recommended,
  {
    rules: {
      "no-unused-vars": ["error", { varsIgnorePattern: "^_" }],
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
];
