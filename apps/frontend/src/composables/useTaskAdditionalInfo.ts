import type { Task } from '../model/Taskgraph';

export const useTaskAdditionalInfo = () => {
  const checkTaskAdditionalInfo = (task: Task) => {
    const hasImplementationNotes = !!(
      task.addition?.implementation_notes &&
      task.addition.implementation_notes.length > 0 &&
      task.addition.implementation_notes.some((note) => note.trim() !== '')
    );

    const hasDataRequirements = !!(
      task.addition?.data_requirements &&
      task.addition.data_requirements.trim() !== ''
    );

    const hasAcceptanceCriteria = !!(
      task.addition?.acceptance_criteria &&
      task.addition.acceptance_criteria.length > 0 &&
      task.addition.acceptance_criteria.some(
        (criteria) => criteria.trim() !== '',
      )
    );

    const hasDesignImages = !!(
      task.addition?.design_images && task.addition.design_images.length > 0
    );

    return {
      hasImplementationNotes,
      hasDataRequirements,
      hasAcceptanceCriteria,
      hasDesignImages,
      filledCount: [
        hasImplementationNotes,
        hasDataRequirements,
        hasAcceptanceCriteria,
        hasDesignImages,
      ].filter(Boolean).length,
    };
  };

  const getSignalDisplay = (task: Task): string => {
    const info = checkTaskAdditionalInfo(task);
    const signals = [];

    if (info.hasImplementationNotes) signals.push('o');
    else signals.push('-');

    if (info.hasDataRequirements) signals.push('o');
    else signals.push('-');

    if (info.hasAcceptanceCriteria) signals.push('o');
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
