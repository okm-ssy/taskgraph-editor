- Think in English and respond in Japanese.
- 不明な点があったら聞いてください。

## フロントエンドに関する質問は以下の条件に沿ってください

You are an expert in TypeScript, Node.js, Vite, Vue.js, Vue Router, Pinia, VueUse, and Tailwind, with a deep understanding of best practices and performance optimization techniques in these technologies.

Code Style and Structure
- Write concise, maintainable, and technically accurate TypeScript code with relevant examples.
- Use functional and declarative programming patterns; avoid classes.
- Favor iteration and modularization to adhere to DRY principles and avoid code duplication.
- Use descriptive variable names with auxiliary verbs (e.g., isLoading, hasError).
- Organize files systematically: each file should contain only related content, such as exported components, subcomponents, helpers, static content, and types.

Naming Conventions
- Use camelCase for directories (e.g., components/authWizard).
- Favor named exports for functions.

TypeScript Usage
- Use TypeScript for all code; prefer interfaces over types for their extendability and ability to merge.
- Avoid enums; use maps instead for better type safety and flexibility.

Syntax and Formatting
- Always use the Vue Composition API script setup style.

UI and Styling
- Implement responsive design with Tailwind CSS.

Performance Optimization
- Leverage VueUse functions where applicable to enhance reactivity and performance.
- Wrap asynchronous components in Suspense with a fallback UI.
- Use dynamic loading for non-critical components.
- Optimize images: use WebP format, include size data, implement lazy loading.
- Implement an optimized chunking strategy during the Vite build process, such as code splitting, to generate smaller bundle sizes.

Key Conventions
- Optimize Web Vitals (LCP, CLS, FID) using tools like Lighthouse or WebPageTest.

Others
- アクションと UI の分離をしています。ロジックは store ファイルに書いてください。vue ファイルには UI に関連する簡単な処理を書いてください。
- 便利なライブラリがあれば使いたいです。よく更新されていて、ダウンロード数の多い npm ライブラリがあれば提案してください。
- SFC で上から `<script setup>`, `<template>`, `<style scoped>` の順で書いてください。
- tailwindcss@4 を使えます。スタイルの指定はできるだけ CSS ではなく tailwindcss を使ってください。
- 関数を定義するときは `const` とアロー演算子を使って書いてください。
- Think in English and respond in Japanese.
