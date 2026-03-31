import React, { createContext, useCallback, useContext, useState } from 'react';
import SavedStamp from '../components/DaisyUI/SavedStamp';

interface SavedStampOptions {
  message?: string;
  variant?: 'success' | 'info' | 'warning';
}

interface SavedStampContextType {
  showStamp: (options?: SavedStampOptions) => void;
}

const SavedStampContext = createContext<SavedStampContextType | undefined>(undefined);

/**
 * Hook to trigger the SAVED rubber stamp animation from any component.
 *
 * @example
 *   const { showStamp } = useSavedStamp();
 *   await apiService.put('/api/config/global', payload);
 *   showStamp();                                    // default "SAVED" + success
 *   showStamp({ message: 'UPDATED', variant: 'info' });
 */
export const useSavedStamp = (): SavedStampContextType => {
  const context = useContext(SavedStampContext);
  if (!context) {
    throw new Error('useSavedStamp must be used within a SavedStampProvider');
  }
  return context;
};

export const SavedStampProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<SavedStampOptions>({});

  const showStamp = useCallback((opts: SavedStampOptions = {}) => {
    // If already animating, reset first
    setVisible(false);
    // Force a new render cycle so the component remounts
    requestAnimationFrame(() => {
      setOptions(opts);
      setVisible(true);
    });
  }, []);

  const handleComplete = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <SavedStampContext.Provider value={{ showStamp }}>
      {children}
      <SavedStamp
        visible={visible}
        onComplete={handleComplete}
        message={options.message}
        variant={options.variant}
      />
    </SavedStampContext.Provider>
  );
};

export default SavedStampProvider;
