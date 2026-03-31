import React, { useState } from 'react';
import { ButtonsDemo } from '../components/DaisyUI/demos/ButtonsDemo';
import { AnimationShowcaseDemo } from '../components/DaisyUI/demos/AnimationShowcaseDemo';
import { InputDemo, SelectDemo, CheckboxDemo, TextareaDemo, FileInputDemo } from '../components/DaisyUI/demos/FormsDemo';
import {
  BadgeDemo,
  AlertDemo,
  CardDemo,
  ModalDemo,
  ToggleDemo,
  RadioDemo,
  RangeDemo,
  DropdownDemo,
  TabsDemo,
  TooltipDemo,
  AvatarDemo,
  ProgressDemo,
  LoadingDemo,
  TableDemo,
  MenuDemo,
  CollapseDemo,
  SkeletonDemo,
  BreadcrumbsDemo,
  StepsDemo,
  StatDemo,
  ChatDemo,
  TimelineDemo,
  CarouselDemo,
  ToastDemo,
} from '../components/DaisyUI/demos/OtherComponentsDemo';

/**
 * DaisyUI Component Showcase
 * This page demonstrates DaisyUI components using raw CSS classes
 * exactly as shown in the official DaisyUI documentation.
 * https://daisyui.com/components/
 */
const DaisyUIShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState('button');
  const [modalOpen, setModalOpen] = useState(false);

  const components = [
    'button', 'badge', 'alert', 'card', 'input', 'select', 'checkbox',
    'toggle', 'radio', 'range', 'modal', 'dropdown', 'tabs', 'tooltip',
    'avatar', 'progress', 'loading', 'table', 'menu', 'collapse',
    'skeleton', 'breadcrumbs', 'textarea', 'file-input', 'steps', 'stat',
    'chat', 'timeline', 'carousel', 'toast', 'animations',
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">DaisyUI Component Reference</h1>
        <p className="text-base-content/60 mt-1">
          Official DaisyUI components using raw CSS classes -
          <a href="https://daisyui.com/components/" target="_blank" rel="noopener noreferrer" className="link link-primary ml-1">
            View Official Docs
          </a>
        </p>
      </div>

      {/* Component Navigation */}
      <div className="tabs tabs-boxed mb-6 flex-wrap">
        {components.map(comp => (
          <button
            key={comp}
            className={`tab ${activeTab === comp ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(comp)}
          >
            {comp.charAt(0).toUpperCase() + comp.slice(1)}
          </button>
        ))}
      </div>

      {/* Component Demos */}
      {activeTab === 'button' && <ButtonsDemo />}
      {activeTab === 'badge' && <BadgeDemo />}
      {activeTab === 'alert' && <AlertDemo />}
      {activeTab === 'card' && <CardDemo />}
      {activeTab === 'input' && <InputDemo />}
      {activeTab === 'select' && <SelectDemo />}
      {activeTab === 'checkbox' && <CheckboxDemo />}
      {activeTab === 'toggle' && <ToggleDemo />}
      {activeTab === 'radio' && <RadioDemo />}
      {activeTab === 'range' && <RangeDemo />}
      {activeTab === 'modal' && <ModalDemo onOpenModal={() => setModalOpen(true)} />}
      {activeTab === 'dropdown' && <DropdownDemo />}
      {activeTab === 'tabs' && <TabsDemo />}
      {activeTab === 'tooltip' && <TooltipDemo />}
      {activeTab === 'avatar' && <AvatarDemo />}
      {activeTab === 'progress' && <ProgressDemo />}
      {activeTab === 'loading' && <LoadingDemo />}
      {activeTab === 'table' && <TableDemo />}
      {activeTab === 'menu' && <MenuDemo />}
      {activeTab === 'collapse' && <CollapseDemo />}
      {activeTab === 'skeleton' && <SkeletonDemo />}
      {activeTab === 'breadcrumbs' && <BreadcrumbsDemo />}
      {activeTab === 'textarea' && <TextareaDemo />}
      {activeTab === 'file-input' && <FileInputDemo />}
      {activeTab === 'steps' && <StepsDemo />}
      {activeTab === 'stat' && <StatDemo />}
      {activeTab === 'chat' && <ChatDemo />}
      {activeTab === 'timeline' && <TimelineDemo />}
      {activeTab === 'carousel' && <CarouselDemo />}
      {activeTab === 'toast' && <ToastDemo />}
      {activeTab === 'animations' && <AnimationShowcaseDemo />}

      {/* Modal */}
      {modalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Hello!</h3>
            <p className="py-4">This is a DaisyUI modal dialog.</p>
            <div className="modal-action">
              <button className="btn" onClick={() => setModalOpen(false)}>Close</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop" onClick={() => setModalOpen(false)}>
            <button>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
};

export default DaisyUIShowcase;
