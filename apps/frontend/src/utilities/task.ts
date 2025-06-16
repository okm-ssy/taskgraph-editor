export const difficultyColorClass = (difficulty: number) => {
  if (difficulty === 0) return 'text-gray-400';
  if (difficulty <= 1) return 'text-blue-500';
  if (difficulty <= 2) return 'text-green-500';
  if (difficulty <= 4) return 'text-yellow-500';
  if (difficulty <= 8) return 'text-red-500';
  return 'text-gray-800';
};
