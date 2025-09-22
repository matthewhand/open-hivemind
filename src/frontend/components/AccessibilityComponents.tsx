import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Accessibility as AccessibilityIcon,
  Keyboard as KeyboardIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setHighContrast, setReducedMotion, selectUIState } from '../store/slices/uiSlice';

interface ScreenReaderAnnouncementProps {
  message: string;
  priority?: 'polite' | 'assertive';
  delay?: number;
}

export const ScreenReaderAnnouncement: React.FC<ScreenReaderAnnouncementProps> = ({
  message,
  priority = 'polite',
  delay = 0,
}) => {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnnouncement(message);
      // Clear after announcement to prevent repetition
      const clearTimer = setTimeout(() => setAnnouncement(''), 1000);
      return () => clearTimeout(clearTimer);
    }, delay);

    return () => clearTimeout(timer);
  }, [message, delay]);

  return (
    <Box
      sx={{
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
      role="status"
      aria-live={priority}
      aria-atomic="true"
    >
      {announcement}
    </Box>
  );
};

interface KeyboardNavigationProps {
  children: React.ReactNode;
  shortcuts?: {
    key: string;
    description: string;
    action: () => void;
  }[];
}

export const KeyboardNavigation: React.FC<KeyboardNavigationProps> = ({
  children,
  shortcuts = [],
}) => {
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Show help overlay
      if (event.ctrlKey && event.key === 'h') {
        event.preventDefault();
        setShowShortcuts(prev => !prev);
      }

      // Handle custom shortcuts
      shortcuts.forEach(shortcut => {
        if (event.key.toLowerCase() === shortcut.key.toLowerCase()) {
          event.preventDefault();
          shortcut.action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  return (
    <>
      {children}
      {showShortcuts && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowShortcuts(false)}
        >
          <Box
            sx={{
              backgroundColor: 'background.paper',
              p: 4,
              borderRadius: 2,
              maxWidth: 600,
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography variant="h6" gutterBottom>
              Keyboard Shortcuts
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Press Ctrl+H to toggle this help
            </Typography>
            <Box sx={{ mt: 2 }}>
              {shortcuts.map((shortcut, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 1,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="body2">{shortcut.description}</Typography>
                  <Box
                    component="kbd"
                    sx={{
                      px: 1,
                      py: 0.5,
                      backgroundColor: 'action.selected',
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                    }}
                  >
                    {shortcut.key}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </>
  );
};

interface HighContrastModeProps {
  children: React.ReactNode;
}

export const HighContrastMode: React.FC<HighContrastModeProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const ui = useAppSelector(selectUIState);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (ui.highContrast) {
      setAnnouncement('High contrast mode enabled');
      document.documentElement.setAttribute('data-high-contrast', 'true');
    } else {
      setAnnouncement('High contrast mode disabled');
      document.documentElement.removeAttribute('data-high-contrast');
    }
  }, [ui.highContrast]);

  return (
    <>
      <ScreenReaderAnnouncement message={announcement} />
      {children}
    </>
  );
};

interface ReducedMotionModeProps {
  children: React.ReactNode;
}

export const ReducedMotionMode: React.FC<ReducedMotionModeProps> = ({ children }) => {
  const ui = useAppSelector(selectUIState);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (ui.reducedMotion) {
      setAnnouncement('Reduced motion mode enabled');
      document.documentElement.setAttribute('data-reduced-motion', 'true');
    } else {
      setAnnouncement('Reduced motion mode disabled');
      document.documentElement.removeAttribute('data-reduced-motion');
    }
  }, [ui.reducedMotion]);

  return (
    <>
      <ScreenReaderAnnouncement message={announcement} />
      {children}
    </>
  );
};

interface FocusManagerProps {
  children: React.ReactNode;
  autoFocus?: boolean;
  focusTrapped?: boolean;
}

export const FocusManager: React.FC<FocusManagerProps> = ({
  children,
  autoFocus = false,
  focusTrapped = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusableElements, setFocusableElements] = useState<HTMLElement[]>([]);

  useEffect(() => {
    if (containerRef.current) {
      const elements = Array.from(
        containerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ) as HTMLElement[];
      setFocusableElements(elements);
    }
  }, []);

  useEffect(() => {
    if (autoFocus && focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }, [autoFocus, focusableElements]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!focusTrapped || focusableElements.length === 0) return;

    const activeElement = document.activeElement as HTMLElement;
    const currentIndex = focusableElements.indexOf(activeElement);

    if (event.key === 'Tab') {
      event.preventDefault();

      if (event.shiftKey) {
        // Shift + Tab (previous)
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
        focusableElements[prevIndex].focus();
      } else {
        // Tab (next)
        const nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
        focusableElements[nextIndex].focus();
      }
    }
  };

  return (
    <Box
      ref={containerRef}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      sx={{ outline: 'none' }}
    >
      {children}
    </Box>
  );
};

interface SkipLinkProps {
  href: string;
  text: string;
}

export const SkipLink: React.FC<SkipLinkProps> = ({ href, text }) => {
  return (
    <Box
      component="a"
      href={href}
      sx={{
        position: 'absolute',
        top: -40,
        left: 6,
        backgroundColor: 'primary.main',
        color: 'primary.contrastText',
        padding: '8px 16px',
        borderRadius: 1,
        textDecoration: 'none',
        zIndex: 9999,
        transition: 'top 0.3s ease',
        '&:focus': {
          top: 6,
        },
      }}
    >
      {text}
    </Box>
  );
};

interface AccessibilityToolbarProps {
  onToggleHighContrast?: () => void;
  onToggleReducedMotion?: () => void;
  onToggleScreenReader?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

export const AccessibilityToolbar: React.FC<AccessibilityToolbarProps> = ({
  onToggleHighContrast,
  onToggleReducedMotion,
  onToggleScreenReader,
  onZoomIn,
  onZoomOut,
}) => {
  const dispatch = useAppDispatch();
  const ui = useAppSelector(selectUIState);
  const [announcement, setAnnouncement] = useState('');

  const handleHighContrastToggle = () => {
    dispatch(setHighContrast(!ui.highContrast));
    setAnnouncement(ui.highContrast ? 'High contrast mode disabled' : 'High contrast mode enabled');
  };

  const handleReducedMotionToggle = () => {
    dispatch(setReducedMotion(!ui.reducedMotion));
    setAnnouncement(ui.reducedMotion ? 'Reduced motion mode disabled' : 'Reduced motion mode enabled');
  };

  return (
    <>
      <ScreenReaderAnnouncement message={announcement} />
      <Box
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          zIndex: 1000,
        }}
      >
        <Tooltip title="Toggle high contrast mode" placement="left">
          <IconButton
            onClick={onToggleHighContrast || handleHighContrastToggle}
            color={ui.highContrast ? 'primary' : 'default'}
            sx={{
              backgroundColor: 'background.paper',
              boxShadow: 3,
            }}
          >
            {ui.highContrast ? <VisibilityIcon /> : <VisibilityOffIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Toggle reduced motion" placement="left">
          <IconButton
            onClick={onToggleReducedMotion || handleReducedMotionToggle}
            color={ui.reducedMotion ? 'primary' : 'default'}
            sx={{
              backgroundColor: 'background.paper',
              boxShadow: 3,
            }}
          >
            <AccessibilityIcon />
          </IconButton>
        </Tooltip>

        {onZoomIn && (
          <Tooltip title="Zoom in" placement="left">
            <IconButton
              onClick={onZoomIn}
              sx={{
                backgroundColor: 'background.paper',
                boxShadow: 3,
              }}
            >
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
        )}

        {onZoomOut && (
          <Tooltip title="Zoom out" placement="left">
            <IconButton
              onClick={onZoomOut}
              sx={{
                backgroundColor: 'background.paper',
                boxShadow: 3,
              }}
            >
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </>
  );
};

interface AccessibleFormProps {
  children: React.ReactNode;
  onSubmit: (data: Record<string, string>) => void;
  ariaLabel: string;
}

export const AccessibleForm: React.FC<AccessibleFormProps> = ({
  children,
  onSubmit,
  ariaLabel,
}) => {
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const data: Record<string, string> = {};
    
    formData.forEach((value, key) => {
      data[key] = value.toString();
    });
    
    onSubmit(data);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      role="form"
      aria-label={ariaLabel}
      sx={{
        '& .MuiTextField-root': { mb: 2 },
        '& .MuiFormControl-root': { mb: 2 },
      }}
    >
      {children}
    </Box>
  );
};

export default {
  ScreenReaderAnnouncement,
  KeyboardNavigation,
  HighContrastMode,
  ReducedMotionMode,
  FocusManager,
  SkipLink,
  AccessibilityToolbar,
  AccessibleForm,
};