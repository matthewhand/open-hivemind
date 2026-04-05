import React, { useState, useMemo } from 'react';
import Link from '../components/DaisyUI/Link';
import Modal from '../components/DaisyUI/Modal';
import Tabs from '../components/DaisyUI/Tabs';
import type { TabItem } from '../components/DaisyUI/Tabs';
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
  CountdownDemo,
  DiffDemo,
  DividerDemo,
  DrawerDemo,
  HeroDemo,
  IndicatorDemo,
  JoinDemo,
  KbdDemo,
  MockupDemo,
  NavbarDemo,
  PaginationDemo,
  RatingDemo,
  ThemeControllerDemo,
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
    'chat', 'timeline', 'carousel', 'toast', 'countdown', 'diff',
    'divider', 'drawer', 'hero', 'indicator', 'join', 'kbd', 'mockup',
    'navbar', 'pagination', 'rating', 'theme-controller', 'animations',
  ];

  const componentTabs: TabItem[] = useMemo(() =>
    components.map(comp => ({
      key: comp,
      label: comp.charAt(0).toUpperCase() + comp.slice(1),
    })), []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">DaisyUI Component Reference</h1>
        <p className="text-base-content/60 mt-1">
          Official DaisyUI components using raw CSS classes -
          <Link href="https://daisyui.com/components/" target="_blank" rel="noopener noreferrer" color="primary" className="ml-1">
            View Official Docs
          </Link>
        </p>
      </div>

      {/* Component Navigation */}
      <Tabs
        tabs={componentTabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="boxed"
        className="mb-6 flex-wrap"
      />

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
      {activeTab === 'countdown' && <CountdownDemo />}
      {activeTab === 'diff' && <DiffDemo />}
      {activeTab === 'divider' && <DividerDemo />}
      {activeTab === 'drawer' && <DrawerDemo />}
      {activeTab === 'hero' && <HeroDemo />}
      {activeTab === 'indicator' && <IndicatorDemo />}
      {activeTab === 'join' && <JoinDemo />}
      {activeTab === 'kbd' && <KbdDemo />}
      {activeTab === 'mockup' && <MockupDemo />}
      {activeTab === 'navbar' && <NavbarDemo />}
      {activeTab === 'pagination' && <PaginationDemo />}
      {activeTab === 'rating' && <RatingDemo />}
      {activeTab === 'theme-controller' && <ThemeControllerDemo />}
      {activeTab === 'animations' && <AnimationShowcaseDemo />}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Hello!"
        actions={[{ label: 'Close', onClick: () => setModalOpen(false), variant: 'primary' }]}
      >
        <p className="py-4">This is a DaisyUI modal dialog.</p>
      </Modal>
    </div>
  );
};

export default DaisyUIShowcase;
