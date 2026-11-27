import React, { useState } from 'react';
import { DEFAULT_TEMPLATE } from './config/template';
import { TemplateConfig } from './types';
import { LandingHero } from './components/LandingHero';
import { FlyerStudio } from './components/FlyerStudio';
import { TemplateModal } from './components/TemplateModal';

export const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'studio'>('home');
  const [template, setTemplate] = useState<TemplateConfig>(DEFAULT_TEMPLATE);
  const [isTemplateModalOpen, setIsTemplateModalOpen] =
    useState<boolean>(false);

  return (
    <>
      {view === 'home' ? (
        <LandingHero onOpenStudio={() => setView('studio')} />
      ) : (
        <FlyerStudio
          template={template}
          onBackHome={() => setView('home')}
          onOpenTemplateModal={() => setIsTemplateModalOpen(true)}
        />
      )}

      <TemplateModal
        isOpen={isTemplateModalOpen}
        template={template}
        onChange={setTemplate}
        onResetDefault={() => setTemplate(DEFAULT_TEMPLATE)}
        onClose={() => setIsTemplateModalOpen(false)}
      />
    </>
  );
};

export default App;
