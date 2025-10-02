import React, { useState } from 'react';
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
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError(''); // Clear error on input change
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Call the real admin login API
      const response = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Use the auth context to set user state
        await login(result.user);
        
        // Navigate to admin or dashboard after successful login
        navigate('/admin', { replace: true });
      } else {
        setError(result.error || 'Invalid username or password');
      }
    } catch (error) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
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

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
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
              disabled={isLoading}
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
              disabled={isLoading}
              placeholder="Check console for password"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
              size="large"
            >
              {isLoading ? (
                <CircularProgress size={24} />
              ) : (
                'Sign In'
              )}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                ⚠️ Check server console for admin credentials
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary', mt: 0.5 }}>
                Password is randomly generated on each restart
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
