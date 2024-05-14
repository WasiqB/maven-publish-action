import stylisticTs from '@stylistic/eslint-plugin-ts';
import stylisticJs from '@stylistic/eslint-plugin-js';
import tsParser from '@typescript-eslint/parser';
import js from '@eslint/js';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  prettierRecommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
    },
    files: ['src/**/*.ts', '__tests__/**/*.ts'],
    ignores: [
      'node_modules/',
      'dist/',
      'docs/',
      './javaTest/',
      '.github/',
      'pnpm-lock.yaml',
      '*.xml',
      '*.md',
      '*.yml',
    ],
    plugins: {
      '@stylistic/ts': stylisticTs,
      '@stylistic/js': stylisticJs,
    },
    rules: {
      '@stylistic/ts/indent': ['error', 2],
      '@stylistic/js/linebreak-style': ['error', 'unix'],
      '@stylistic/ts/quotes': ['error', 'single'],
      '@stylistic/ts/semi': ['error', 'always'],
      '@stylistic/js/max-len': ['error', { code: 100 }],
      'prefer-promise-reject-errors': ['off'],
      'no-return-assign': ['off'],
      'no-shadow': 'off',
      'import/prefer-default-export': 'off',
      'prettier/prettier': ['error', { singleQuote: true }],
      '@typescript-eslint/no-explicit-any': ['off'],
      '@typescript-eslint/explicit-function-return-type': ['error'],
    },
  },
];
