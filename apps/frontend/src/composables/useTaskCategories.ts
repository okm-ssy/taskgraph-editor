import { ref, computed } from 'vue';

interface CategoryMapping {
  category: string;
  difficulty: number;
  field: string;
}

const categoryMappings = ref<CategoryMapping[]>([]);
const isLoaded = ref(false);
const loadError = ref<string | null>(null);

export const useTaskCategories = () => {
  // TSVファイルの読み込み
  const loadCategories = async () => {
    try {
      const response = await fetch('/task-categories.tsv');
      if (!response.ok) {
        throw new Error(`Failed to load categories: ${response.statusText}`);
      }

      const text = await response.text();
      const lines = text.trim().split('\n');

      const mappings: CategoryMapping[] = [];
      for (const line of lines) {
        if (line.trim()) {
          const [category, difficultyStr, field] = line.split('\t');
          const difficulty = parseFloat(difficultyStr?.trim() || '0');

          if (category?.trim() && !isNaN(difficulty) && difficulty >= 0) {
            mappings.push({
              category: category.trim(),
              difficulty,
              field: field?.trim() || '',
            });
          }
        }
      }

      categoryMappings.value = mappings;
      isLoaded.value = true;
      loadError.value = null;
    } catch (error) {
      loadError.value =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to load task categories:', error);
    }
  };

  // 分類名から難易度を取得
  const getDifficultyByCategory = (category: string): number | null => {
    if (!category.trim()) return null;

    // 完全一致を優先
    const exactMatch = categoryMappings.value.find(
      (mapping) => mapping.category.toLowerCase() === category.toLowerCase(),
    );
    if (exactMatch) return exactMatch.difficulty;

    // 部分一致を検索
    const partialMatch = categoryMappings.value.find(
      (mapping) =>
        mapping.category.toLowerCase().includes(category.toLowerCase()) ||
        category.toLowerCase().includes(mapping.category.toLowerCase()),
    );
    if (partialMatch) return partialMatch.difficulty;

    return null;
  };

  // 分類名の候補を取得（オートコンプリート用）
  const getCategorySuggestions = (input: string): string[] => {
    if (!input.trim()) return [];

    const inputLower = input.toLowerCase();
    return categoryMappings.value
      .filter((mapping) => mapping.category.toLowerCase().includes(inputLower))
      .map((mapping) => mapping.category)
      .slice(0, 5); // 最大5件
  };

  // 利用可能な全分類を取得
  const allCategories = computed(() =>
    categoryMappings.value.map((mapping) => mapping.category),
  );

  // 分類名から分野を取得
  const getFieldByCategory = (category: string): string | null => {
    if (!category.trim()) return null;

    // 完全一致を優先
    const exactMatch = categoryMappings.value.find(
      (mapping) => mapping.category.toLowerCase() === category.toLowerCase(),
    );
    if (exactMatch) return mapJapaneseFieldToEnum(exactMatch.field);

    // 部分一致を検索
    const partialMatch = categoryMappings.value.find(
      (mapping) =>
        mapping.category.toLowerCase().includes(category.toLowerCase()) ||
        category.toLowerCase().includes(mapping.category.toLowerCase()),
    );
    if (partialMatch) return mapJapaneseFieldToEnum(partialMatch.field);

    return null;
  };

  // 固定の分野選択肢 (enum値)
  const fieldOptions = ref(['front', 'back', 'infra', 'other', 'parent']);

  // 分野の表示名マッピング
  const fieldDisplayNames = {
    front: 'フロント',
    back: 'バック',
    infra: 'インフラ',
    other: 'その他',
    parent: '親',
  } as const;

  // enum値から表示名を取得
  const getFieldDisplayName = (fieldValue: string): string => {
    return (
      fieldDisplayNames[fieldValue as keyof typeof fieldDisplayNames] ||
      fieldValue
    );
  };

  // 日本語の分野名をenum値にマッピング
  const mapJapaneseFieldToEnum = (japaneseField: string): string => {
    switch (japaneseField) {
      case 'フロント':
        return 'front';
      case 'バック':
        return 'back';
      case 'インフラ':
        return 'infra';
      case 'その他':
        return 'other';
      case '親':
        return 'parent';
      default:
        return 'other';
    }
  };

  // 初期化
  if (!isLoaded.value && !loadError.value) {
    loadCategories();
  }

  return {
    categoryMappings: computed(() => categoryMappings.value),
    allCategories,
    fieldOptions: computed(() => fieldOptions.value),
    isLoaded: computed(() => isLoaded.value),
    loadError: computed(() => loadError.value),
    loadCategories,
    getDifficultyByCategory,
    getFieldByCategory,
    getFieldDisplayName,
    getCategorySuggestions,
  };
};
