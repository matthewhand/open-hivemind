/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import {
  Download,
  FileJson,
  FileCode,
  FileText,
  Share2,
  Database,
  Archive,
  BookOpen
} from 'lucide-react';
import { Card, Button, PageHeader, ToastNotification, Alert } from '../components/DaisyUI';

interface ExportOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  format: string;
  color?: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
  action: () => void;
}

const ExportPage: React.FC = () => {
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleDownload = async (endpoint: string, filename: string, id: string) => {
    setIsLoading(id);
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to download ${filename}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setToast({ message: `${filename} downloaded successfully`, type: 'success' });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : `Failed to download ${filename}`,
        type: 'error',
      });
    } finally {
      setIsLoading(null);
    }
  };

  const exportOptions: ExportOption[] = [
    {
      id: 'openapi-json',
      title: 'OpenAPI Specification (JSON)',
      description: 'Complete API documentation in standard JSON format for programmatic use.',
      icon: <FileJson className="w-8 h-8" />,
      format: 'JSON',
      color: 'primary',
      action: () => handleDownload('/webui/api/openapi.json', 'openapi-spec.json', 'openapi-json'),
    },
    {
      id: 'openapi-yaml',
      title: 'OpenAPI Specification (YAML)',
      description: 'Human-readable API documentation in YAML format for easy reading.',
      icon: <FileCode className="w-8 h-8" />,
      format: 'YAML',
      color: 'secondary',
      action: () => handleDownload('/webui/api/openapi.yaml', 'openapi-spec.yaml', 'openapi-yaml'),
    },
    {
      id: 'postman',
      title: 'Postman Collection',
      description: 'Importable collection for testing API endpoints directly in Postman.',
      icon: <Share2 className="w-8 h-8" />,
      format: 'JSON',
      color: 'accent',
      action: () => handleDownload('/webui/api/postman-collection.json', 'hivemind-postman.json', 'postman'),
    },
    {
        id: 'db-schema',
        title: 'Database Schema',
        description: 'Structure of the database tables and relationships.',
        icon: <Database className="w-8 h-8" />,
        format: 'SQL',
        color: 'info',
        action: () => handleDownload('/webui/api/schema.sql', 'schema.sql', 'db-schema'),
    }
  ];

  const documentationOptions: ExportOption[] = [
      {
          id: 'user-guide',
          title: 'User Guide',
          description: 'Comprehensive guide for using the Open-Hivemind WebUI.',
          icon: <BookOpen className="w-8 h-8" />,
          format: 'PDF',
          color: 'success',
          action: () => handleDownload('/webui/docs/user-guide.pdf', 'user-guide.pdf', 'user-guide'),
      },
      {
          id: 'dev-docs',
          title: 'Developer Documentation',
          description: 'Technical details for extending and customizing the platform.',
          icon: <FileText className="w-8 h-8" />,
          format: 'Markdown',
          color: 'warning',
          action: () => handleDownload('/webui/docs/developer-guide.md', 'developer-guide.md', 'dev-docs'),
      }
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Export & Documentation"
        description="Download API specifications, system schemas, and documentation resources."
        icon={Archive}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* API Exports Section */}
        <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 px-1">
                <FileCode className="w-5 h-5 text-primary" />
                API Specifications
            </h2>
            <div className="grid grid-cols-1 gap-4">
                {exportOptions.map((option) => (
                    <Card key={option.id} className="hover:shadow-md transition-shadow duration-200 border border-base-200">
                        <div className="card-body p-5 flex flex-row items-center gap-4">
                            <div className={`p-3 rounded-xl bg-${option.color}/10 text-${option.color}`}>
                                {option.icon}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg">{option.title}</h3>
                                <p className="text-sm text-base-content/70">{option.description}</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="btn-square"
                                onClick={option.action}
                                loading={isLoading === option.id}
                                disabled={!!isLoading}
                                title={`Download ${option.format}`}
                            >
                                <Download className="w-5 h-5" />
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        </section>

        {/* Documentation Section */}
        <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 px-1">
                <BookOpen className="w-5 h-5 text-secondary" />
                System Documentation
            </h2>
            <div className="grid grid-cols-1 gap-4">
                {documentationOptions.map((option) => (
                    <Card key={option.id} className="hover:shadow-md transition-shadow duration-200 border border-base-200">
                        <div className="card-body p-5 flex flex-row items-center gap-4">
                            <div className={`p-3 rounded-xl bg-${option.color}/10 text-${option.color}`}>
                                {option.icon}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg">{option.title}</h3>
                                <p className="text-sm text-base-content/70">{option.description}</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="btn-square"
                                onClick={option.action}
                                loading={isLoading === option.id}
                                disabled={!!isLoading}
                                title={`Download ${option.format}`}
                            >
                                <Download className="w-5 h-5" />
                            </Button>
                        </div>
                    </Card>
                ))}

                {/* Info Card */}
                <Alert variant="info" className="mt-4">
                    <div className="flex flex-col gap-1">
                        <span className="font-bold">Need more help?</span>
                        <span className="text-sm opacity-90">Check out the official GitHub repository for the latest updates and community support.</span>
                    </div>
                </Alert>
            </div>
        </section>
      </div>

      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default ExportPage;