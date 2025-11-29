import React, { useState } from 'react';
import { Card, Badge, Button, Alert, Input, Modal, Select } from './DaisyUI';
import {
  Cog6ToothIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'secret';
  description?: string;
  isRequired: boolean;
  category: 'database' | 'api' | 'feature' | 'security' | 'performance';
}

const mockVariables: EnvironmentVariable[] = [
  {
    id: '1',
    key: 'DATABASE_URL',
    value: 'postgresql://localhost:5432/hivemind',
    type: 'secret',
    description: 'Database connection string',
    isRequired: true,
    category: 'database'
  },
  {
    id: '2',
    key: 'API_RATE_LIMIT',
    value: '1000',
    type: 'number',
    description: 'Maximum API requests per hour',
    isRequired: false,
    category: 'api'
  },
  {
    id: '3',
    key: 'ENABLE_CACHE',
    value: 'true',
    type: 'boolean',
    description: 'Enable caching system',
    isRequired: false,
    category: 'performance'
  },
  {
    id: '4',
    key: 'JWT_SECRET',
    value: '••••••••••••••••',
    type: 'secret',
    description: 'JWT authentication secret',
    isRequired: true,
    category: 'security'
  },
];

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'database', label: 'Database' },
  { value: 'api', label: 'API' },
  { value: 'feature', label: 'Features' },
  { value: 'security', label: 'Security' },
  { value: 'performance', label: 'Performance' },
];

const EnvironmentManager: React.FC = () => {
  const [variables, setVariables] = useState<EnvironmentVariable[]>(mockVariables);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVariable, setEditingVariable] = useState<EnvironmentVariable | null>(null);
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    type: 'string' as const,
    description: '',
    isRequired: false,
    category: 'feature' as const,
  });

  const filteredVariables = variables.filter(variable => {
    const categoryMatch = selectedCategory === 'all' || variable.category === selectedCategory;
    const searchMatch = searchTerm === '' ||
      variable.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (variable.description && variable.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return categoryMatch && searchMatch;
  });

  const handleSave = () => {
    if (editingVariable) {
      setVariables(prev => prev.map(v =>
        v.id === editingVariable.id
          ? { ...v, ...formData }
          : v
      ));
    } else {
      const newVariable: EnvironmentVariable = {
        id: Date.now().toString(),
        ...formData
      };
      setVariables(prev => [...prev, newVariable]);
    }

    setShowModal(false);
    setEditingVariable(null);
    resetForm();
  };

  const handleEdit = (variable: EnvironmentVariable) => {
    setEditingVariable(variable);
    setFormData({
      key: variable.key,
      value: variable.type === 'secret' ? '' : variable.value,
      type: variable.type,
      description: variable.description || '',
      isRequired: variable.isRequired,
      category: variable.category,
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    setVariables(prev => prev.filter(v => v.id !== id));
  };

  const resetForm = () => {
    setFormData({
      key: '',
      value: '',
      type: 'string',
      description: '',
      isRequired: false,
      category: 'feature',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'secret': return '🔒';
      case 'boolean': return '☑️';
      case 'number': return '🔢';
      default: return '📝';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'database': return 'info';
      case 'api': return 'warning';
      case 'security': return 'error';
      case 'performance': return 'success';
      default: return 'neutral';
    }
  };

  const requiredCount = variables.filter(v => v.isRequired).length;
  const secretCount = variables.filter(v => v.type === 'secret').length;
  const totalCount = variables.length;

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg border-l-4 border-info">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Cog6ToothIcon className="w-8 h-8 text-info" />
              <div>
                <h2 className="card-title text-2xl">Environment Manager</h2>
                <p className="text-sm opacity-70">Manage environment variables and configuration</p>
              </div>
            </div>
            <Button onClick={() => setShowModal(true)} className="btn-primary">
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Variable
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-primary">{totalCount}</div>
            <p className="text-sm opacity-70">Total Variables</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-error">{requiredCount}</div>
            <p className="text-sm opacity-70">Required</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-warning">{secretCount}</div>
            <p className="text-sm opacity-70">Secrets</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-success">{filteredVariables.length}</div>
            <p className="text-sm opacity-70">Filtered</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search variables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Category:</span>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="select-bordered"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Variables List */}
      <Card className="shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">Environment Variables</h3>
          <div className="space-y-2">
            {filteredVariables.map((variable) => (
              <div key={variable.id} className="border border-base-300 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getTypeIcon(variable.type)}</span>
                    <div>
                      <h4 className="font-semibold font-mono">{variable.key}</h4>
                      <p className="text-sm opacity-70">{variable.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral" size="sm">
                      {variable.type}
                    </Badge>
                    <Badge variant={getCategoryColor(variable.category)} size="sm">
                      {variable.category}
                    </Badge>
                    {variable.isRequired && (
                      <Badge variant="error" size="sm">Required</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <code className="text-sm bg-base-200 px-2 py-1 rounded">
                      {variable.type === 'secret' ? '••••••••••••••••' : variable.value}
                    </code>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      className="btn-ghost"
                      onClick={() => handleEdit(variable)}
                    >
                      <PencilIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="btn-ghost"
                      onClick={() => handleDelete(variable.id)}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredVariables.length === 0 && (
            <div className="text-center py-8">
              <Cog6ToothIcon className="w-16 h-16 mx-auto text-primary mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No variables found</h3>
              <p className="opacity-70 mb-4">
                {searchTerm || selectedCategory !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Add your first environment variable'
                }
              </p>
              <Button onClick={() => setShowModal(true)} className="btn-primary">
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Variable
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingVariable(null);
          resetForm();
        }}
        title={editingVariable ? 'Edit Environment Variable' : 'Add Environment Variable'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Key</label>
            <Input
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              placeholder="VARIABLE_KEY"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Value</label>
            <Input
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              placeholder="Variable value"
              className="w-full"
              type={formData.type === 'secret' ? 'password' : 'text'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <Select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="select-bordered w-full"
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="secret">Secret</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <Select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="select-bordered w-full"
            >
              <option value="feature">Features</option>
              <option value="database">Database</option>
              <option value="api">API</option>
              <option value="security">Security</option>
              <option value="performance">Performance</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Variable description"
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isRequired}
              onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
              className="checkbox"
            />
            <span className="text-sm">Required</span>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} className="btn-primary">
              {editingVariable ? 'Update' : 'Add'} Variable
            </Button>
            <Button
              onClick={() => {
                setShowModal(false);
                setEditingVariable(null);
                resetForm();
              }}
              className="btn-ghost"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Alert variant="info" className="flex items-center gap-3">
        <Cog6ToothIcon className="w-5 h-5" />
        <div>
          <p className="font-medium">Environment variables configured</p>
          <p className="text-sm opacity-70">{requiredCount} required, {secretCount} secrets</p>
        </div>
      </Alert>
    </div>
  );
};

export default EnvironmentManager;