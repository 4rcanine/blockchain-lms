module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
    ecmaVersion: 2020, // Use a modern ECMAScript version
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
  ],
  plugins: ["@typescript-eslint", "import"],
  rules: {
    "quotes": ["error", "double"],
    "import/no-unresolved": 0,
    "indent": "off", // Let Prettier or other formatters handle this
    "object-curly-spacing": "off", // Let Prettier or other formatters handle this
    "require-jsdoc": "off", // Not necessary for this project
    "max-len": "off", // Not critical
    "no-unused-vars": "off", // TypeScript's compiler handles this better
    "@typescript-eslint/no-unused-vars": ["warn"],
  },
};