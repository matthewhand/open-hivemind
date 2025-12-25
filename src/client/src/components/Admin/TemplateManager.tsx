import React, { useState, useEffect } from 'react';
import { Badge, Alert, Button, Modal } from '../DaisyUI';
import {
  DocumentDuplicateIcon,
  PlusIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface Template {
    id: string;
    name: string;
    description: string;
    provider: string;
    content: Record<string, any>;
}

const TemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [newBotName, setNewBotName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/config/templates');
      if (!res.ok) {throw new Error('Failed to fetch templates');}
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setNewBotName(`${template.name}-${Math.floor(Math.random() * 1000)}`);
    setIsModalOpen(true);
    setSuccessMessage(null);
  };

  const handleCreateBot = async () => {
    if (!selectedTemplate) {return;}

    try {
      setCreating(true);
      setError(null);

      const res = await fetch(`/api/config/templates/${selectedTemplate.id}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBotName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create bot');
      }

      setSuccessMessage(data.message);
      setTimeout(() => setIsModalOpen(false), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {return <div className="flex justify-center items-center min-h-[200px]"><span className="loading loading-spinner loading-lg"></span></div>;}

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Bot Templates</h2>
          <p className="text-base-content/60">Start quickly by creating a bot from a pre-configured template.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={fetchTemplates} startIcon={<ArrowPathIcon className="w-5 h-5" />}>Refresh</Button>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <Alert status="error" message={error} onClose={() => setError(null)} />
        </div>
      )}

      {templates.length === 0 ? (
        <div className="col-span-full text-center py-12">
          <DocumentDuplicateIcon className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <h3 className="text-lg font-semibold text-base-content/70">No Templates Found</h3>
          <p className="text-base-content/50 mb-4">Create templates in <code>config/templates/*.json</code> to get started.</p>
        </div>
      ) : (
        templates.map(template => (
          <div key={template.id} className="card bg-base-100 shadow-xl border border-base-200 hover:shadow-2xl transition-shadow">
            <div className="card-body">
              <div className="flex justify-between items-start">
                <h3 className="card-title capitalize">{template.name}</h3>
                <Badge variant="secondary">{template.provider}</Badge>
              </div>
              <p className="text-sm text-base-content/70 h-10 overflow-hidden text-ellipsis line-clamp-2">{template.description}</p>

              <div className="card-actions justify-end mt-4">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSelectTemplate(template)}
                  startIcon={<DocumentDuplicateIcon className="w-4 h-4" />}
                >
                                    Use Template
                </Button>
              </div>
            </div>
          </div>
        ))
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Create Bot from "${selectedTemplate?.name}"`}
      >
        <div className="flex flex-col gap-4">
          {successMessage ? (
            <Alert status="success" message={successMessage} />
          ) : (
            <>
              <div className="form-control">
                <label className="label"><span className="label-text">New Bot Name</span></label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={newBotName}
                  onChange={e => setNewBotName(e.target.value)}
                  placeholder="My New Bot"
                />
                <label className="label"><span className="label-text-alt">Choose a unique name for your new bot</span></label>
              </div>

              <div className="alert alert-info text-sm">
                                This will create a new bot configuration file based on the selected template. You can customize it further in the Agents tab.
              </div>

              <div className="modal-action">
                <Button onClick={() => setIsModalOpen(false)} disabled={creating}>Cancel</Button>
                <Button variant="primary" onClick={handleCreateBot} loading={creating} disabled={creating || !newBotName.trim()}>Create Bot</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default TemplateManager;
