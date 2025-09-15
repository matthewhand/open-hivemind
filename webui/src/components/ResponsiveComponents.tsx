import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import type { Breakpoint } from '@mui/material';

export interface ResponsiveProps {
  children: React.ReactNode;
  breakpoint?: Breakpoint;
  orientation?: 'portrait' | 'landscape';
}

export const ResponsiveContainer: React.FC<ResponsiveProps> = ({
  children,
  breakpoint = 'sm',
  orientation,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(breakpoint));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const isLandscape = useMediaQuery('(orientation: landscape)');
  
  const shouldShow = !orientation || 
    (orientation === 'portrait' && isPortrait) || 
    (orientation === 'landscape' && isLandscape);

  return (
    <Box
      sx={{
        display: shouldShow ? 'block' : 'none',
        '& .mobile-only': { display: isMobile ? 'block' : 'none' },
        '& .tablet-only': { display: isTablet ? 'block' : 'none' },
        '& .desktop-only': { display: isDesktop ? 'block' : 'none' },
        '& .portrait-only': { display: isPortrait ? 'block' : 'none' },
        '& .landscape-only': { display: isLandscape ? 'block' : 'none' },
      }}
    >
      {children}
    </Box>
  );
};

export interface AdaptiveGridProps {
  children: React.ReactNode;
  spacing?: number;
  itemSpacing?: number;
  breakpoints?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

export const AdaptiveGrid: React.FC<AdaptiveGridProps> = ({
  children,
  spacing = 2,
  itemSpacing = 2,
  breakpoints = { xs: 12, sm: 6, md: 4, lg: 3 },
}) => {
  return (
    <Grid container spacing={spacing}>
      {React.Children.map(children, (child, index) => (
        <Grid 
          key={index} 
          size={breakpoints}
          sx={{ mb: itemSpacing }}
        >
          {child}
        </Grid>
      ))}
    </Grid>
  );
};

export interface ResponsiveCardProps {
  title: string;
  subtitle?: string;
  content: React.ReactNode;
  actions?: React.ReactNode;
  elevation?: number;
  image?: string;
  imageHeight?: number | string;
  variant?: 'outlined' | 'elevation';
}

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  title,
  subtitle,
  content,
  actions,
  elevation = 2,
  image,
  imageHeight = 200,
  variant = 'elevation',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  return (
    <Card
      elevation={variant === 'elevation' ? elevation : 0}
      variant={variant}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isMobile ? 2 : 3,
      }}
    >
      {image && (
        <Box
          component="img"
          src={image}
          alt={title}
          sx={{
            height: imageHeight,
            width: '100%',
            objectFit: 'cover',
          }}
        />
      )}
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography
          variant={isMobile ? 'h6' : 'h5'}
          component="h2"
          gutterBottom
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="body2"
            color="text.secondary"
            gutterBottom
          >
            {subtitle}
          </Typography>
        )}
        <Box sx={{ mb: 2 }}>
          {content}
        </Box>
      </CardContent>
      {actions && (
        <Box sx={{ p: 2, pt: 0 }}>
          {actions}
        </Box>
      )}
    </Card>
  );
};

export interface ResponsiveTypographyProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body1' | 'body2';
  mobileVariant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body1' | 'body2';
  component?: React.ElementType;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' | 'textPrimary' | 'textSecondary';
  align?: 'left' | 'center' | 'right' | 'justify';
  gutterBottom?: boolean;
  noWrap?: boolean;
}

export const ResponsiveTypography: React.FC<ResponsiveTypographyProps> = ({
  children,
  variant = 'body1',
  mobileVariant,
  component,
  color = 'textPrimary',
  align = 'left',
  gutterBottom = false,
  noWrap = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  return (
    <Box
      component="span"
      sx={{
        '& .mobile-text': { fontSize: '0.875rem' },
        '& .tablet-text': { fontSize: '1rem' },
        '& .desktop-text': { fontSize: '1.125rem' },
      }}
    >
      <Box
        component={component || 'span'}
        sx={{
          fontSize: isMobile && mobileVariant ? 
            theme.typography[mobileVariant].fontSize : 
            theme.typography[variant].fontSize,
          fontWeight: theme.typography[variant].fontWeight,
          lineHeight: theme.typography[variant].lineHeight,
          color: color.startsWith('text') ? 
            theme.palette.text[color.replace('text', '').toLowerCase() as 'primary' | 'secondary'] :
            theme.palette[color as 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'].main,
          textAlign: align,
          mb: gutterBottom ? 2 : 0,
          overflow: noWrap ? 'hidden' : 'visible',
          textOverflow: noWrap ? 'ellipsis' : 'clip',
          whiteSpace: noWrap ? 'nowrap' : 'normal',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export interface ResponsiveButtonGroupProps {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  spacing?: number;
  fullWidth?: boolean;
}

export const ResponsiveButtonGroup: React.FC<ResponsiveButtonGroupProps> = ({
  children,
  orientation = 'horizontal',
  spacing = 1,
  fullWidth = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : orientation,
        gap: spacing,
        width: fullWidth ? '100%' : 'auto',
        '& > *': {
          flex: fullWidth ? 1 : 'none',
        },
      }}
    >
      {children}
    </Box>
  );
};

export interface ResponsiveTableProps<T> {
  data: T[];
  columns: {
    key: keyof T;
    header: string;
    render?: (value: T[keyof T], item: T) => React.ReactNode;
    sortable?: boolean;
    filterable?: boolean;
  }[];
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export const ResponsiveTable = <T extends Record<string, unknown>>({
  data,
  columns,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
}: ResponsiveTableProps<T>) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }
  
  if (data.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">{emptyMessage}</Typography>
      </Box>
    );
  }
  
  if (isMobile) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {data.map((item, index) => (
          <Card
            key={index}
            onClick={() => onRowClick?.(item)}
            sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
          >
            <CardContent>
              {columns.map((column) => (
                <Box key={String(column.key)} sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {column.header}:
                  </Typography>
                  <Typography variant="body2">
                    {column.render 
                      ? column.render(item[column.key], item)
                      : String(item[column.key])
                    }
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }
  
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                style={{
                  textAlign: 'left',
                  padding: theme.spacing(2),
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  backgroundColor: theme.palette.background.paper,
                }}
              >
                <Typography variant="subtitle2">
                  {column.header}
                </Typography>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={index}
              onClick={() => onRowClick?.(item)}
              style={{
                cursor: onRowClick ? 'pointer' : 'default',
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              {columns.map((column) => (
                <td
                  key={String(column.key)}
                  style={{
                    padding: theme.spacing(2),
                    borderBottom: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography variant="body2">
                    {column.render 
                      ? column.render(item[column.key], item)
                      : String(item[column.key])
                    }
                  </Typography>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  );
};

export interface ResponsiveNavigationProps {
  items: {
    label: string;
    icon?: React.ReactNode;
    href?: string;
    onClick?: () => void;
    active?: boolean;
    disabled?: boolean;
  }[];
  orientation?: 'horizontal' | 'vertical';
  variant?: 'tabs' | 'pills' | 'underline';
}

export const ResponsiveNavigation: React.FC<ResponsiveNavigationProps> = ({
  items,
  orientation = 'horizontal',
  variant = 'tabs',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : orientation,
        gap: 1,
        '& > *': {
          minWidth: isMobile ? '100%' : 'auto',
        },
      }}
    >
      {items.map((item, index) => (
        <Box
          key={index}
          component="button"
          onClick={item.onClick}
          disabled={item.disabled}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            border: 'none',
            backgroundColor: item.active ? theme.palette.primary.main : 'transparent',
            color: item.active ? theme.palette.primary.contrastText : theme.palette.text.primary,
            borderRadius: variant === 'pills' ? 4 : 0,
            borderBottom: variant === 'underline' && item.active ? 
              `2px solid ${theme.palette.primary.main}` : 'none',
            cursor: item.disabled ? 'not-allowed' : 'pointer',
            opacity: item.disabled ? 0.5 : 1,
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: item.active ? 
                theme.palette.primary.dark : 
                theme.palette.action.hover,
            },
          }}
        >
          {item.icon}
          <span>{item.label}</span>
        </Box>
      ))}
    </Box>
  );
};

export default {
  ResponsiveContainer,
  AdaptiveGrid,
  ResponsiveCard,
  ResponsiveTypography,
  ResponsiveButtonGroup,
  ResponsiveTable,
  ResponsiveNavigation,
};