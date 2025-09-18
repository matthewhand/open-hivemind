import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  clearError,
  loginFailure,
  loginStart,
  loginSuccess,
  selectAuth,
} from '../store/slices/authSlice';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const auth = useAppSelector(selectAuth);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  interface LocationState {
    from?: {
      pathname?: string;
    };
  }
  
  const from = (location.state as LocationState)?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [auth.isAuthenticated, from, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    dispatch(loginStart());

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock authentication
      if (formData.username === 'admin' && formData.password === 'admin') {
        const now = Date.now();
        dispatch(loginSuccess({
          user: {
            id: 'demo-admin',
            username: formData.username,
            email: 'admin@example.com',
            role: 'admin',
            permissions: ['view_dashboard', 'manage_bots', 'manage_config', 'view_performance'],
            lastLogin: new Date(now).toISOString(),
          },
          token: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token',
          expiresAt: now + 60 * 60 * 1000,
        }));
        navigate(from, { replace: true });
      } else {
        dispatch(loginFailure('Invalid username or password'));
      }
    } catch (err) {
      dispatch(loginFailure(err instanceof Error ? err.message : 'Login failed'));
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Open-Hivemind
          </Typography>
          
          <Typography variant="h6" component="h2" gutterBottom align="center">
            Sign In
          </Typography>

          {auth.error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {auth.error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleInputChange}
              margin="normal"
              required
              autoComplete="username"
              disabled={auth.isLoading}
              placeholder="Enter 'admin'"
            />
            
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              margin="normal"
              required
              autoComplete="current-password"
              disabled={auth.isLoading}
              placeholder="Enter 'admin'"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={auth.isLoading}
              size="large"
            >
              {auth.isLoading ? (
                <CircularProgress size={24} />
              ) : (
                'Sign In'
              )}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Demo credentials: admin / admin
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
