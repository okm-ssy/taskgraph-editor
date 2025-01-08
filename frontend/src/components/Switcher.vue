<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

interface RouteConfig {
  path: string;
  name: string;
}

// ルート設定
const routes: RouteConfig[] = [
  { path: '/edit', name: 'エディター' },
  { path: '/view', name: 'ビュー' },
];

const router = useRouter();
const route = useRoute();
const currentPath = ref(route.path);

// ルート変更ハンドラー
const handleRouteChange = () => {
  router.push(currentPath.value);
};

// コンポーネントマウント時に現在のパスを設定
onMounted(() => {
  currentPath.value = route.path;
});
</script>

<template>
  <div class="space-x-3 m-2">
    <label
      v-for="route in routes"
      :key="route.path"
      class="px-3 border rounded-lg border-gray-700"
    >
      <input
        type="radio"
        :value="route.path"
        v-model="currentPath"
        @change="handleRouteChange"
        :checked="currentPath === route.path"
      />
      {{ route.name }}
    </label>
  </div>
</template>

<style scoped></style>
