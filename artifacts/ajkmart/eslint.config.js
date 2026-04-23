// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      "dist/*",
      "build/*",
      ".expo/*",
      "node_modules/*",
      "public/*",
      "shims/*",
      "scripts/*",
      "server/*",
      "expo-env.d.ts",
    ],
  },
  {
    rules: {
      // React Native does not render to the DOM, so HTML entity escaping
      // (`'` -> `&apos;`, etc.) adds no value and only fights against natural
      // copy in user-facing strings. Disabled project-wide on purpose.
      "react/no-unescaped-entities": "off",
    },
  },
]);
