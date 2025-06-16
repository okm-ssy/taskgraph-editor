export const difficultyColorClass = (difficulty: number) => {
  if (difficulty < 0.5) return 'text-gray-400';
  if (difficulty <= 1) return 'text-blue-500';
  if (difficulty <= 2) return 'text-green-500';
  if (difficulty <= 4) return 'text-yellow-500';
  if (difficulty <= 8) return 'text-red-500';
  return 'text-gray-800';
};

export const difficultyBackgroundClass = (difficulty: number) => {
  if (difficulty < 0.5) return 'bg-gray-200 border-gray-400';
  if (difficulty <= 1) return 'bg-blue-100 border-blue-400';
  if (difficulty <= 2) return 'bg-emerald-100 border-emerald-500';
  if (difficulty <= 3) return 'bg-yellow-100 border-yellow-500';
  if (difficulty <= 4) return 'bg-orange-100 border-orange-500';
  if (difficulty <= 5) return 'bg-red-100 border-red-500';
  return 'bg-purple-100 border-purple-500';
};
