import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // PRIMERO: Ignorar completamente la carpeta dist/
  {
    ignores: [
      "dist/**",
      "build/**", 
      "node_modules/**",
      "*.config.js",
      "*.config.mjs"
    ]
  },
  
  // SEGUNDO: Configuración para el resto de archivos
  {
    files: ["**/*.{js,mjs,cjs}"],
    ignores: [], // No ignorar nada más
    plugins: { js },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser
      },
      sourceType: "commonjs"
    },
    rules: {
      'no-unused-vars': ['warn', { 'argsIgnorePattern': '^next$' }],
      'no-console': 'off',
      'no-undef': 'off',
      'no-empty': 'warn',
      'no-prototype-builtins': 'off',
      'no-cond-assign': 'off',
      'no-fallthrough': 'off',
      'no-constant-condition': 'off',
      'no-useless-escape': 'off',
      'no-useless-assignment': 'off',
      'no-control-regex': 'off',
      'no-misleading-character-class': 'off'
    }
  }
]);