import React from 'react';
import PersonaManager from '../components/PersonaManager';
import { Breadcrumbs, FileUpload } from '../components/DaisyUI';

const PersonasPage: React.FC = () => {
  const breadcrumbItems = [{ label: 'Personas', href: '/personas', isActive: true }];

  const handleFileSelect = (file: File) => {
    // TODO: Implement file processing logic to create persona from uploaded file
    console.log('File selected:', file);
  };

  return (
    <div>
      <Breadcrumbs items={breadcrumbItems} />
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Upload Persona Configuration</h2>
        <FileUpload onFileSelect={handleFileSelect} fileTypes={['application/json']} />
      </div>
      <PersonaManager />
    </div>
  );
};

export default PersonasPage;