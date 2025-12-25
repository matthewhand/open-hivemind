import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Button, Badge, Dropdown, Breadcrumbs } from '../components/DaisyUI';
import { ArrowLeftIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import useSpec from '../hooks/useSpec';

const SpecDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { spec, loading, error } = useSpec(id);

  const handleExport = (format: 'md' | 'json' | 'yaml') => {
    if (!spec) {return;}

    let content = '';
    let mimeType = '';
    let filename = '';

    switch (format) {
    case 'md':
      content = spec.content;
      mimeType = 'text/markdown';
      filename = `${spec.topic}.md`;
      break;
    case 'json':
      content = JSON.stringify(spec, null, 2);
      mimeType = 'application/json';
      filename = `${spec.topic}.json`;
      break;
    case 'yaml':
      content = `
topic: ${spec.topic}
author: ${spec.author}
date: ${spec.date}
tags:
${spec.tags.map(tag => `  - ${tag}`).join('\n')}
content: |
${spec.content.replace(/^/gm, '  ')}
        `.trim();
      mimeType = 'text/yaml';
      filename = `${spec.topic}.yaml`;
      break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportItems = [
    { label: 'Markdown', onClick: () => handleExport('md') },
    { label: 'JSON', onClick: () => handleExport('json') },
    { label: 'YAML', onClick: () => handleExport('yaml') },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error || !spec) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <div className="card-body text-center">
            <h2 className="card-title text-error">Error Loading Spec</h2>
            <p className="opacity-70">{error || 'Specification not found'}</p>
            <Button className="btn-primary" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: 'Specs', href: '/specs' },
    { label: spec.topic, href: `/specs/${id}`, isActive: true },
  ];

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-6">
        <Card className="shadow-lg">
          <div className="card-body">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button
                  size="sm"
                  className="btn-ghost"
                  onClick={() => window.history.back()}
                >
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-3xl font-bold">{spec.topic}</h1>
                  <p className="opacity-70">By {spec.author} • {new Date(spec.date).toLocaleDateString()}</p>
                </div>
              </div>
              <Dropdown
                trigger={
                  <Button className="btn-primary">
                    <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                }
                items={exportItems}
              />
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {spec.tags.map((tag, index) => (
                <Badge key={index} variant="neutral" size="sm">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Content */}
            <div className="prose max-w-none">
              <ReactMarkdown>{spec.content}</ReactMarkdown>
            </div>

            {/* Footer */}
            <div className="divider mt-8"></div>
            <div className="flex justify-between items-center">
              <p className="text-sm opacity-70">
                Last updated: {new Date(spec.date).toLocaleString()}
              </p>
              <div className="flex gap-2">
                <Button size="sm" className="btn-ghost">
                  Edit
                </Button>
                <Button size="sm" className="btn-ghost">
                  Share
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SpecDetailPage;