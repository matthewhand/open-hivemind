import { useState, useCallback } from 'react';
import type { ProviderModalState, MessageProvider, LLMProvider } from '../types/bot';

const useModal = () => {
  const [modalState, setModalState] = useState<ProviderModalState>({
    isOpen: false,
    providerType: 'message',
    isEdit: false,
    provider: null,
    botId: null
  });

  // Open modal for adding provider
  const openAddModal = useCallback((botId: string, providerType: 'message' | 'llm') => {
    setModalState({
      isOpen: true,
      providerType,
      isEdit: false,
      provider: null,
      botId
    });
  }, []);

  // Open modal for editing provider
  const openEditModal = useCallback((
    botId: string,
    providerType: 'message' | 'llm',
    provider: MessageProvider | LLMProvider
  ) => {
    setModalState({
      isOpen: true,
      providerType,
      isEdit: true,
      provider,
      botId
    });
  }, []);

  // Close modal
  const closeModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      isOpen: false,
      provider: null,
      botId: null
    }));
  }, []);

  // Reset modal to initial state
  const resetModal = useCallback(() => {
    setModalState({
      isOpen: false,
      providerType: 'message',
      isEdit: false,
      provider: null,
      botId: null
    });
  }, []);

  // Update modal state
  const updateModalState = useCallback((updates: Partial<ProviderModalState>) => {
    setModalState(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    modalState,
    openAddModal,
    openEditModal,
    closeModal,
    resetModal,
    updateModalState
  };
};

export { useModal };
export default useModal;
