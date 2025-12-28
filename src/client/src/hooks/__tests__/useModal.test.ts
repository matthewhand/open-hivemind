import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModal } from '../useModal';

describe('useModal', () => {
    it('should initialize with closed modal state', () => {
        const { result } = renderHook(() => useModal());

        expect(result.current.modalState.isOpen).toBe(false);
        expect(result.current.modalState.isEdit).toBe(false);
        expect(result.current.modalState.provider).toBe(null);
        expect(result.current.modalState.botId).toBe(null);
    });

    it('should open modal for adding message provider', () => {
        const { result } = renderHook(() => useModal());

        act(() => {
            result.current.openAddModal('bot-123', 'message');
        });

        expect(result.current.modalState.isOpen).toBe(true);
        expect(result.current.modalState.providerType).toBe('message');
        expect(result.current.modalState.isEdit).toBe(false);
        expect(result.current.modalState.botId).toBe('bot-123');
    });

    it('should open modal for adding LLM provider', () => {
        const { result } = renderHook(() => useModal());

        act(() => {
            result.current.openAddModal('bot-456', 'llm');
        });

        expect(result.current.modalState.isOpen).toBe(true);
        expect(result.current.modalState.providerType).toBe('llm');
        expect(result.current.modalState.botId).toBe('bot-456');
    });

    it('should open modal for editing provider', () => {
        const { result } = renderHook(() => useModal());
        const mockProvider = { type: 'discord', enabled: true };

        act(() => {
            result.current.openEditModal('bot-789', 'message', mockProvider as any);
        });

        expect(result.current.modalState.isOpen).toBe(true);
        expect(result.current.modalState.isEdit).toBe(true);
        expect(result.current.modalState.provider).toEqual(mockProvider);
    });

    it('should close modal and clear provider data', () => {
        const { result } = renderHook(() => useModal());

        act(() => {
            result.current.openAddModal('bot-123', 'message');
        });

        act(() => {
            result.current.closeModal();
        });

        expect(result.current.modalState.isOpen).toBe(false);
        expect(result.current.modalState.provider).toBe(null);
        expect(result.current.modalState.botId).toBe(null);
    });

    it('should reset modal to initial state', () => {
        const { result } = renderHook(() => useModal());

        act(() => {
            result.current.openEditModal('bot-123', 'llm', { type: 'openai' } as any);
        });

        act(() => {
            result.current.resetModal();
        });

        expect(result.current.modalState).toEqual({
            isOpen: false,
            providerType: 'message',
            isEdit: false,
            provider: null,
            botId: null,
        });
    });

    it('should update modal state partially', () => {
        const { result } = renderHook(() => useModal());

        act(() => {
            result.current.updateModalState({ isOpen: true, botId: 'partial-update' });
        });

        expect(result.current.modalState.isOpen).toBe(true);
        expect(result.current.modalState.botId).toBe('partial-update');
        expect(result.current.modalState.providerType).toBe('message'); // unchanged
    });
});
