import React, { useState } from 'react';
import { MCP_TEMPLATES, type MCPTemplate } from '../../../mcp/templates';
import Card from '../DaisyUI/Card';
import Button from '../DaisyUI/Button';
import Badge from '../DaisyUI/Badge';
import Modal from '../DaisyUI/Modal';
import Input from '../DaisyUI/Input';
import { Puzzle, ArrowRight, Check, ExternalLink, Settings, Info } from 'lucide-react';
import { apiService } from '../../services/api';

const TemplateGallery: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<MCPTemplate | null>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [installData, setInstallData] = useState<Record<string, string>>({});
  const [installing, setInstalling] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleOpenInstall = (template: MCPTemplate) => {
    setSelectedTemplate(template);
    const initialData: Record<string, string> = { name: template.name, serverUrl: template.defaultUrl };
    template.requiredConfigFields.forEach(f => initialData[f.key] = '');
    setInstallData(initialData);
    setIsInstallModalOpen(true);
    setSuccess(false);
  };

  const handleInstall = async () => {
    if (!selectedTemplate) return;
    setInstalling(true);
    try {
      const apiKey = selectedTemplate.requiredConfigFields.find(f => f.key === 'API_KEY' || f.key.includes('SECRET'))?.key;
      const payload = {
        name: installData.name,
        serverUrl: installData.serverUrl,
        apiKey: apiKey ? installData[apiKey] : undefined,
      };
      
      await apiService.post('/api/admin/mcp-servers/connect', payload);
      setSuccess(true);
      setTimeout(() => {
        setIsInstallModalOpen(false);
        setSuccess(false);
      }, 2000);
    } catch (err) {
      alert('Installation failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Puzzle className="w-8 h-8 text-primary" />
            MCP Template Gallery
          </h2>
          <p className="text-sm opacity-50">Quickly add pre-configured Model Context Protocol servers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MCP_TEMPLATES.map((template) => (
          <Card key={template.id} className="bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-all group">
            <Card.Body className="p-6">
               <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-primary/10 text-primary text-2xl rounded-2xl group-hover:bg-primary group-hover:text-primary-content transition-colors">
                     {template.icon}
                  </div>
                  {template.docsUrl && (
                    <a href={template.docsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-xs btn-ghost btn-circle" aria-label={`Open documentation for ${template.name}`}>
                       <ExternalLink className="w-4 h-4 opacity-40" />
                    </a>
                  )}
               </div>
               
               <h3 className="font-bold text-lg mb-2">{template.name}</h3>
               <p className="text-sm opacity-60 mb-6 flex-1">{template.description}</p>
               
               <div className="flex items-center justify-between mt-auto pt-4 border-t border-base-200">
                  <div className="flex flex-wrap gap-1">
                     {template.requiredConfigFields.length > 0 ? (
                       <Badge size="xs" variant="outline">Requires Config</Badge>
                     ) : (
                       <Badge size="xs" variant="success" style="outline">One-Click</Badge>
                     )}
                  </div>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => handleOpenInstall(template)}
                  >
                     Install <ArrowRight className="w-4 h-4" />
                  </Button>
               </div>
            </Card.Body>
          </Card>
        ))}
      </div>

      {/* Install Modal */}
      <Modal 
        isOpen={isInstallModalOpen} 
        onClose={() => setIsInstallModalOpen(false)} 
        title={`Install ${selectedTemplate?.name}`}
      >
        <div className="space-y-4">
          {success ? (
            <div className="py-8 text-center space-y-4 animate-in zoom-in-95">
               <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-bold">Successfully Installed!</h3>
               <p className="text-sm opacity-60">Redirecting to manager...</p>
            </div>
          ) : (
            <>
              <div className="form-control">
                <label className="label"><span className="label-text">Server Instance Name</span></label>
                <Input 
                  value={installData.name || ''} 
                  onChange={e => setInstallData({...installData, name: e.target.value})} 
                />
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text">Server URL</span></label>
                <Input 
                  value={installData.serverUrl || ''} 
                  onChange={e => setInstallData({...installData, serverUrl: e.target.value})} 
                />
              </div>

              {selectedTemplate?.requiredConfigFields.map(field => (
                <div key={field.key} className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-1">
                       {field.label}
                       {field.description && <Tooltip content={field.description}><Info className="w-3 h-3 opacity-40" /></Tooltip>}
                    </span>
                  </label>
                  <Input 
                    type={field.type === 'password' ? 'password' : 'text'}
                    placeholder={field.placeholder}
                    value={installData[field.key] || ''} 
                    onChange={e => setInstallData({...installData, [field.key]: e.target.value})} 
                  />
                </div>
              ))}

              <div className="pt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setIsInstallModalOpen(false)}>Cancel</Button>
                <Button 
                  variant="primary" 
                  loading={installing}
                  onClick={handleInstall}
                >
                   Complete Installation
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default TemplateGallery;

const Tooltip = ({ children, content }: any) => (
  <div className="tooltip" data-tip={content}>{children}</div>
);
