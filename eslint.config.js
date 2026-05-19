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
      // any is acceptable as a warning — clean up gradually
      "@typescript-eslint/no-explicit-any": "warn",
      // Hard SEO/A11y errors
      "jsx-a11y/alt-text": ["error", { elements: ["img"] }],
      "jsx-a11y/iframe-has-title": "error",
      "jsx-a11y/html-has-lang": "error",
      // Label association: warning so existing codebase stays buildable;
      // new violations should be fixed before merging (check git diff --stat)
      "jsx-a11y/label-has-associated-control": ["warn", {
        labelComponents: ["label", "Label"],
        labelAttributes: ["htmlFor"],
        controlComponents: ["input", "textarea", "select", "Input", "Textarea", "SelectTrigger"],
        assert: "either",
        depth: 5,
      }],
      "jsx-a11y/anchor-has-content": "warn",
    },
  },
  {
    // shadcn UI primitives — skip strict checks on generated headless components
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "jsx-a11y/label-has-associated-control": "off",
      "jsx-a11y/anchor-has-content": "off",
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  {
    // ReactMarkdown renderers use spread props — anchor content comes from markdown source
    files: ["src/components/markdown/**/*.{ts,tsx}"],
    rules: {
      "jsx-a11y/anchor-has-content": "off",
    },
  },
  {
    // tailwind.config.ts uses CommonJS require() for plugin registration
    files: ["tailwind.config.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
