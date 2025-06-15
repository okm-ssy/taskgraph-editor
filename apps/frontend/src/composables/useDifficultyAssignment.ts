import { ref, computed } from 'vue';

export interface DifficultyRule {
  category: string;
  difficulty: number;
}

export const useDifficultyAssignment = () => {
  // デフォルトの難易度ルール
  const defaultRules = ref<DifficultyRule[]>([
    { category: 'frontend', difficulty: 2 },
    { category: 'backend', difficulty: 3 },
    { category: 'database', difficulty: 4 },
    { category: 'testing', difficulty: 1 },
    { category: 'documentation', difficulty: 1 },
    { category: 'devops', difficulty: 5 },
    { category: 'ui', difficulty: 2 },
    { category: 'api', difficulty: 3 },
    { category: 'security', difficulty: 5 },
    { category: 'performance', difficulty: 4 },
  ]);

  // 設定可能なカテゴリのリスト
  const availableCategories = computed(() =>
    defaultRules.value.map((rule) => rule.category),
  );

  // カテゴリに基づいて難易度を取得
  const getDifficultyByCategory = (category: string): number => {
    const rule = defaultRules.value.find((r) => r.category === category);
    return rule ? rule.difficulty : 1; // デフォルトは1
  };

  // カテゴリの難易度ルールを更新
  const updateDifficultyRule = (category: string, difficulty: number) => {
    const existingRule = defaultRules.value.find(
      (r) => r.category === category,
    );
    if (existingRule) {
      existingRule.difficulty = difficulty;
    } else {
      defaultRules.value.push({ category, difficulty });
    }
  };

  // カテゴリルールを削除
  const removeDifficultyRule = (category: string) => {
    const index = defaultRules.value.findIndex((r) => r.category === category);
    if (index > -1) {
      defaultRules.value.splice(index, 1);
    }
  };

  // 新しいカテゴリルールを追加
  const addDifficultyRule = (category: string, difficulty: number) => {
    if (!defaultRules.value.find((r) => r.category === category)) {
      defaultRules.value.push({ category, difficulty });
    }
  };

  return {
    defaultRules,
    availableCategories,
    getDifficultyByCategory,
    updateDifficultyRule,
    removeDifficultyRule,
    addDifficultyRule,
  };
};
