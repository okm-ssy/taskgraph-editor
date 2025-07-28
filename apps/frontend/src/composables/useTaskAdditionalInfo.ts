import type { Task } from '../model/Taskgraph';

export const useTaskAdditionalInfo = () => {
  const checkTaskAdditionalInfo = (task: Task) => {
    const hasImplementationNotes = !!(
      task.addition?.implementation_notes &&
      task.addition.implementation_notes.length > 0 &&
      task.addition.implementation_notes.some((note) => note.trim() !== '')
    );

    const hasApiSchemas = !!(
      task.addition?.api_schemas &&
      task.addition.api_schemas.length > 0 &&
      task.addition.api_schemas.some((schema) => schema.trim() !== '')
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
      hasApiSchemas,
      hasRequirements,
      hasDesignImages,
      filledCount: [
        hasImplementationNotes,
        hasApiSchemas,
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

    if (info.hasApiSchemas) signals.push('o');
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
