import { useCallback } from 'react';
import { useUndoRedo } from './use-undo-redo';
import { useBusinessData } from './use-business-data';

export const useStateManager = () => {
  const { saveState } = useUndoRedo();
  const businessData = useBusinessData();

  const saveCurrentState = useCallback(async (description: string) => {
    const currentState = {
      contracts: businessData.contracts,
      objects: businessData.objects,
      engineers: businessData.engineers,
      tasks: businessData.tasks,
      kanbanTasks: businessData.kanbanTasks,
      contractKanbanTasks: businessData.contractKanbanTasks,
      reports: businessData.reports
    };

    await saveState(currentState, description);
  }, [businessData, saveState]);

  return {
    saveCurrentState
  };
};