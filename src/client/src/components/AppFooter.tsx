import React from 'react';
import Footer from './DaisyUI/Footer';
import Link from './DaisyUI/Link';
import { Github, BookOpen, Palette } from 'lucide-react';

const APP_VERSION = '1.0.0';

const AppFooter: React.FC = () => {
  return (
    <Footer center className="py-4 px-6 text-base-content/50 text-xs border-t border-base-content/5">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span>Powered by Open Hivemind v{APP_VERSION}</span>
        <span className="hidden sm:inline opacity-30">|</span>
        <Link
          href="https://github.com/matthewhand/open-hivemind"
          target="_blank"
          rel="noopener noreferrer"
          hover
          className="inline-flex items-center gap-1 hover:text-base-content/80 transition-colors"
        >
          <Github className="w-3 h-3" />
          GitHub
        </Link>
        <Link
          href="/admin/api-docs"
          hover
          className="inline-flex items-center gap-1 hover:text-base-content/80 transition-colors"
        >
          <BookOpen className="w-3 h-3" />
          API Docs
        </Link>
        <Link
          href="/admin/showcase"
          hover
          className="inline-flex items-center gap-1 hover:text-base-content/80 transition-colors"
        >
          <Palette className="w-3 h-3" />
          UI Showcase
        </Link>
      </div>
    </Footer>
  );
};

export default AppFooter;
