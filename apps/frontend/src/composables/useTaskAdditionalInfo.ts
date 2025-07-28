import type { Task } from '../model/Taskgraph';

export const useTaskAdditionalInfo = () => {
  const checkTaskAdditionalInfo = (task: Task) => {
    const hasImplementationNotes = !!(
      task.addition?.implementation_notes &&
      task.addition.implementation_notes.length > 0 &&
      task.addition.implementation_notes.some((note) => note.trim() !== '')
    );

    const hasApiSchema = !!(
      task.addition?.api_schema && task.addition.api_schema.trim() !== ''
    );

    const hasRequirements = !!(
      task.addition?.requirements &&
      task.addition.requirements.length > 0 &&
      task.addition.requirements.some((criteria) => criteria.trim() !== '')
    );

    const hasDesignImages = !!(
      task.addition?.design_images && task.addition.design_images.length > 0
    );

    return {
      hasImplementationNotes,
      hasApiSchema,
      hasRequirements,
      hasDesignImages,
      filledCount: [
        hasImplementationNotes,
        hasApiSchema,
        hasRequirements,
        hasDesignImages,
      ].filter(Boolean).length,
    };
  };

  const getSignalDisplay = (task: Task): string => {
    const info = checkTaskAdditionalInfo(task);
    const signals = [];

    if (info.hasImplementationNotes) signals.push('o');
    else signals.push('-');

    if (info.hasApiSchema) signals.push('o');
    else signals.push('-');

    if (info.hasRequirements) signals.push('o');
    else signals.push('-');

    if (info.hasDesignImages) signals.push('o');
    else signals.push('-');

    return signals.join('');
  };

  return {
    checkTaskAdditionalInfo,
    getSignalDisplay,
  };
};
