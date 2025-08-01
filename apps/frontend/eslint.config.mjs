import pluginJs from '@eslint/js';
import pluginImport from 'eslint-plugin-import';
import pluginPrettier from 'eslint-plugin-prettier';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  { files: ['**/*.{js,mjs,cjs,ts,vue}'] },
  {
    languageOptions: {
      globals: globals.browser,
      parser: tseslint.parser, // TypeScript parser を追加
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.{js,mjs,cjs,ts,vue}'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,vue}'],
    rules: {
      // _ を冒頭につけることで未使用変数を許可
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // anyの暗黙的な使用を禁止（Parameter 'req' implicitly has an 'any' typeを検知）
      '@typescript-eslint/no-explicit-any': 'error',
      
      // 新しいコードでのみ型注釈を要求（既存コードには影響しない）
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // コンポーネントの命名規則を SampleComponent.vue のように複数単語だけでなく Sample.vue のような単語も許可
      'vue/multi-word-component-names': 'off',

      // HTMLタグ で <div></div> を <div /> とするよう強制
      'vue/html-self-closing': [
        'error',
        {
          html: {
            void: 'always',
            normal: 'always',
            component: 'always',
          },
          svg: 'never', // SVGに format を効かせない
          math: 'always',
        },
      ],
    },
  },
  {
    plugins: { import: pluginImport },
    rules: {
      // import の順序のルール
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: false },
        },
      ],
    },
  },
  {
    // Prettier の設定を一番最後に置く
    plugins: { prettier: pluginPrettier },
    rules: {
      'prettier/prettier': [
        'error',
        {
          // テキストのクォートを シングルクォート に強制
          singleQuote: true,

          // 末尾のセミコロンを強制
          semi: true,
        },
      ],
    },
  },
  // Prettier の設定に以降に ESLint の設定を追加してはならない
];
