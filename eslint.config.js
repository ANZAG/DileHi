import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "scripts/**", "supabase/functions/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // SEO/A11y rules enforced in CI
      "jsx-a11y/alt-text": ["error", { elements: ["img"] }],
      "jsx-a11y/label-has-associated-control": ["error", {
        labelComponents: ["label"],
        labelAttributes: ["htmlFor"],
        controlComponents: ["input", "textarea", "select"],
        assert: "either",
        depth: 3,
      }],
      "jsx-a11y/anchor-has-content": "error",
      "jsx-a11y/iframe-has-title": "error",
      "jsx-a11y/html-has-lang": "error",
    },
  },
  {
    // shadcn UI primitives are headless wrappers — skip strict label pairing
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "jsx-a11y/label-has-associated-control": "off",
    },
  },
);
