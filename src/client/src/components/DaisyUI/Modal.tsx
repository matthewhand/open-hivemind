import React, { useEffect, useRef } from 'react';

export interface ModalAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
}

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  position?: 'center' | 'top' | 'bottom';
  closable?: boolean;
  className?: string;
}

interface ModalProps extends BaseModalProps {
  actions?: ModalAction[];
  showCloseButton?: boolean;
}

interface ConfirmModalProps extends Omit<BaseModalProps, 'children'> {
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: ModalAction['variant'];
  onConfirm: () => void;
  loading?: boolean;
}

// Base Modal Component
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  actions = [],
  size = 'md',
  position = 'center',
  closable = true,
  showCloseButton = true,
  className = '',
}) => {
  const modalRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) {return;}

    // Check if showModal is defined (it might not be in JSDOM or some environments without polyfill)
    if (typeof modal.showModal !== 'function' || typeof modal.close !== 'function') {
        // Fallback for environments where HTMLDialogElement is not fully supported
        return;
    }

    if (isOpen) {
      if (!modal.open) {
        modal.showModal();
      }
    } else {
      if (modal.open) {
        modal.close();
      }
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current && closable) {
      onClose();
    }
  };

  const getSizeClass = () => {
    switch (size) {
    case 'sm': return 'modal-box w-11/12 max-w-sm';
    case 'md': return 'modal-box w-11/12 max-w-md';
    case 'lg': return 'modal-box w-11/12 max-w-2xl';
    case 'xl': return 'modal-box w-11/12 max-w-5xl';
    case 'full': return 'modal-box w-11/12 max-w-7xl h-full';
    default: return 'modal-box w-11/12 max-w-md';
    }
  };

  const getPositionClass = () => {
    switch (position) {
    case 'top': return 'modal-middle';
    case 'bottom': return 'modal-bottom';
    default: return 'modal-middle';
    }
  };

  const getVariantClass = (variant?: ModalAction['variant']) => {
    switch (variant) {
    case 'primary': return 'btn-primary';
    case 'secondary': return 'btn-secondary';
    case 'success': return 'btn-success';
    case 'warning': return 'btn-warning';
    case 'error': return 'btn-error';
    case 'ghost': return 'btn-ghost';
    default: return 'btn-primary';
    }
  };

  return (
    <dialog 
      ref={modalRef} 
      className={`modal ${getPositionClass()} ${className}`}
      onClick={handleBackdropClick}
      // If isOpen is true and showModal is not supported/called, ensure it's visible via CSS class or open attribute if needed
      // DaisyUI uses 'modal-open' class usually or just <dialog open>
      // But for native dialog with DaisyUI, showModal() adds 'open' attribute and backdrop
      open={isOpen} // Fallback/Sync for React
    >
      <div className={getSizeClass()}>
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between mb-4">
            {title && <h3 className="font-bold text-lg">{title}</h3>}
            {showCloseButton && closable && (
              <button 
                className="btn btn-sm btn-circle btn-ghost"
                onClick={onClose}
                aria-label="Close modal"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="py-4">
          {isOpen && children}
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div className="modal-action">
            {actions.map((action, index) => (
              <button
                key={index}
                className={`btn ${getVariantClass(action.variant)} ${action.loading ? 'loading' : ''}`}
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
              >
                {action.loading ? '' : action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </dialog>
  );
};

// Confirmation Modal
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  loading = false,
  ...props
}) => {
  const actions: ModalAction[] = [
    {
      label: cancelText,
      onClick: onClose,
      variant: 'ghost',
      disabled: loading,
    },
    {
      label: confirmText,
      onClick: onConfirm,
      variant: confirmVariant,
      loading,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      actions={actions}
      closable={!loading}
      {...props}
    >
      <div className="text-base-content">
        <p>{message}</p>
      </div>
    </Modal>
  );
};

// Success Modal
export const SuccessModal: React.FC<Omit<BaseModalProps, 'children'> & { message: string }> = ({
  isOpen,
  onClose,
  title = 'Success!',
  message,
  ...props
}) => {
  const actions: ModalAction[] = [
    {
      label: 'OK',
      onClick: onClose,
      variant: 'success',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      actions={actions}
      {...props}
    >
      <div className="text-center py-6">
        <div className="text-6xl mb-4">✅</div>
        <p className="text-lg">{message}</p>
      </div>
    </Modal>
  );
};

// Error Modal
export const ErrorModal: React.FC<Omit<BaseModalProps, 'children'> & { 
  message: string; 
  error?: string;
  onRetry?: () => void;
}> = ({
  isOpen,
  onClose,
  title = 'Error',
  message,
  error,
  onRetry,
  ...props
}) => {
  const actions: ModalAction[] = [
    ...(onRetry ? [{
      label: 'Retry',
      onClick: onRetry,
      variant: 'primary' as const,
    }] : []),
    {
      label: 'Close',
      onClick: onClose,
      variant: 'ghost' as const,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      actions={actions}
      {...props}
    >
      <div className="text-center py-6">
        <div className="text-6xl mb-4">❌</div>
        <p className="text-lg mb-4">{message}</p>
        {error && (
          <div className="alert alert-error">
            <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>
    </Modal>
  );
};

// Loading Modal
export const LoadingModal: React.FC<Omit<BaseModalProps, 'children'> & { 
  message?: string;
}> = ({
  isOpen,
  onClose,
  title = 'Loading...',
  message = 'Please wait while we process your request.',
  ...props
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      closable={false}
      showCloseButton={false}
      {...props}
    >
      <div className="text-center py-8">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="mt-4 text-base-content/70">{message}</p>
      </div>
    </Modal>
  );
};

// Info Modal with rich content
export const InfoModal: React.FC<Omit<BaseModalProps, 'children'> & { 
  message: string;
  details?: React.ReactNode;
  icon?: string;
}> = ({
  isOpen,
  onClose,
  title = 'Information',
  message,
  details,
  icon = 'ℹ️',
  ...props
}) => {
  const actions: ModalAction[] = [
    {
      label: 'Got it',
      onClick: onClose,
      variant: 'primary',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      actions={actions}
      {...props}
    >
      <div className="py-4">
        <div className="flex items-start gap-4">
          <div className="text-4xl">{icon}</div>
          <div className="flex-1">
            <p className="text-base mb-4">{message}</p>
            {details && (
              <div className="bg-base-200 p-4 rounded-lg">
                {details}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default Modal;