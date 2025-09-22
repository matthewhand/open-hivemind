import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Switch, FormControlLabel, Box } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';

declare module '@mui/material/styles' {
  interface Palette {
    neutral: {
      main: string;
      contrastText: string;
    };
  }
  interface PaletteOptions {
    neutral?: {
      main: string;
      contrastText: string;
    };
  }
}

const ThemeContext = createContext<{
  toggleTheme: () => void;
  isDarkMode: boolean;
}>({
  toggleTheme: () => {},
  isDarkMode: false,
});

export const useThemeContext = () => useContext(ThemeContext);

interface ThemeEngineProviderProps {
  children: ReactNode;
}

export const ThemeEngineProvider: React.FC<ThemeEngineProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? JSON.parse(saved) : false;
  });

  const toggleTheme = () => {
    setIsDarkMode((prev: boolean) => {
      const newMode = !prev;
      localStorage.setItem('theme', JSON.stringify(newMode));
      return newMode;
    });
  };

  const theme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: '#007bff',
        light: '#4dabf5',
        dark: '#0056b3',
      },
      secondary: {
        main: '#6c757d',
        light: '#9ca3af',
        dark: '#495057',
      },
      background: {
        default: isDarkMode ? '#121212' : '#f8f9fa',
        paper: isDarkMode ? '#1e1e1e' : '#ffffff',
      },
      neutral: {
        main: isDarkMode ? '#bdbdbd' : '#6c757d',
        contrastText: isDarkMode ? '#000000' : '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: {
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      h6: {
        fontWeight: 600,
      },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: isDarkMode
              ? '0 4px 6px rgba(0, 0, 0, 0.3)'
              : '0 2px 4px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease-in-out',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
            fontWeight: 600,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
          },
        },
      },
    },
  });

  useEffect(() => {
    // Load Inter font from Google Fonts
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ toggleTheme, isDarkMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};

export const ThemeToggle: React.FC = () => {
  const { toggleTheme, isDarkMode } = useThemeContext();

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Brightness7 />
      <FormControlLabel
        control={
          <Switch
            checked={isDarkMode}
            onChange={toggleTheme}
            color="primary"
          />
        }
        label=""
      />
      <Brightness4 />
    </Box>
  );
};

export default ThemeEngineProvider;