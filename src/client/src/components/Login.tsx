/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import Card from './DaisyUI/Card';
import Input from './DaisyUI/Input';
import Button from './DaisyUI/Button';
import { Alert } from './DaisyUI/Alert';
import { Loading } from './DaisyUI/Loading';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isServerless, isTrustedNetwork, trustedLogin } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isTrustedLoading, setIsTrustedLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (error) {setError('');} // Clear error on input change
  };

  const handleTrustedLogin = async () => {
    setIsTrustedLoading(true);
    setError('');
    try {
      await trustedLogin();
      navigate('/admin/bots', { replace: true });
    } catch (err) {
      setError('Trusted network login failed');
    } finally {
      setIsTrustedLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const success = await login(formData.username, formData.password);
      if (success) {
        navigate('/admin/bots', { replace: true });
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('An unexpected error occurred');
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

          {isServerless && (
            <div className="alert alert-warning mb-6 text-sm py-2">
              <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
              <span>Serverless Mode: Use ADMIN_PASSWORD or check logs for generated credentials.</span>
            </div>
          )}

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
                placeholder="Enter password"
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
                <><span className="loading loading-spinner loading-sm mr-2" aria-hidden="true"></span> Signing in...</>
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="text-center mt-4">
              <p className="text-sm text-base-content/70">
                {isServerless ? 'Check deployment logs for password if not configured' : 'Enter your credentials'}
              </p>
            </div>
          </form>

          {isTrustedNetwork && (
            <>
              <div className="divider text-base-content/50">or</div>
              <div className="bg-success/10 border border-success/30 rounded-box p-4">
                <Button
                  variant="success"
                  size="lg"
                  className="w-full"
                  onClick={handleTrustedLogin}
                  disabled={isTrustedLoading}
                >
                  {isTrustedLoading ? (
                    <><span className="loading loading-spinner loading-sm mr-2" aria-hidden="true"></span> Logging in...</>
                  ) : (
                    'Login as Admin (Trusted Network)'
                  )}
                </Button>
                <p className="text-sm text-success text-center mt-2">
                  You're on a trusted network — login without a password
                </p>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Login;
