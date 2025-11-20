import React, { useState } from 'react';
import { Card, Input, Button, Alert, Loading } from './DaisyUI';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const navigate = useNavigate();

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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock authentication
      if (formData.username === 'admin' && formData.password === 'admin') {
        navigate('/dashboard', { replace: true });
      } else {
        setError('Invalid username or password');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <Card className="max-w-md w-full mx-4">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-center mb-2">Open-Hivemind</h1>
          <h2 className="text-xl text-center mb-6">Sign In</h2>

          {error && (
            <Alert status="error" message={error} className="mb-4" />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Username *</span>
              </label>
              <Input
                name="username"
                type="text"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Enter 'admin'"
                disabled={isLoading}
                required
                autoComplete="username"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Password *</span>
              </label>
              <Input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter 'admin'"
                disabled={isLoading}
                required
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              size="lg"
              className="w-full mt-6"
            >
              {isLoading ? (
                <><Loading size="sm" className="mr-2" /> Signing in...</>
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="text-center mt-4">
              <p className="text-sm text-base-content/70">
                Demo credentials: admin / admin
              </p>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default Login;
