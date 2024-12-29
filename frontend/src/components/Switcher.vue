<!-- NavigationComponent.vue -->
<template>
  <div class="radio-group">
    <label v-for="route in routes" :key="route.path">
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
  console.log(currentPath.value);
});
</script>

<style scoped></style>
