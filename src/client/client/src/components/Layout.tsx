import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 p-4">
        <h1 className="text-2xl font-bold">Open-Hivemind</h1>
      </header>
      <main className="container mx-auto p-4">
        {children}
      </main>
    </div>
  );
};

export default Layout;