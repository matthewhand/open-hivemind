import { useCallback, useId, useMemo, useState, type KeyboardEvent } from 'react';

/**
 * Props that should be spread onto the clickable *trigger* element of a
 * disclosure (e.g. a `<div>` acting as a collapsible section header) so that it
 * is fully keyboard- and screen-reader-accessible.
 *
 * This mirrors the WAI-ARIA Disclosure pattern: the trigger exposes
 * `role="button"`, is focusable, advertises its expanded state via
 * `aria-expanded`, points at the controlled region via `aria-controls`, and
 * toggles on both Enter and Space (with the default scroll/submit behaviour of
 * Space suppressed).
 */
export interface DisclosureTriggerProps {
  role: 'button';
  tabIndex: 0;
  'aria-expanded': boolean;
  'aria-controls': string;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
}

/**
 * Props that should be spread onto the collapsible *content* region so that the
 * `aria-controls` reference on the trigger resolves to a real element.
 */
export interface DisclosureContentProps {
  id: string;
}

export interface UseDisclosureResult {
  /** Whether the controlled region is currently expanded. */
  isOpen: boolean;
  /** Imperatively open the region. */
  open: () => void;
  /** Imperatively close the region. */
  close: () => void;
  /** Toggle the region. */
  toggle: () => void;
  /** Spread onto the trigger element. */
  triggerProps: DisclosureTriggerProps;
  /** Spread onto the controlled content element. */
  contentProps: DisclosureContentProps;
}

export interface UseDisclosureOptions {
  /** Initial open state. Defaults to `false`. */
  defaultOpen?: boolean;
  /**
   * Controlled open state. When provided the hook becomes controlled and
   * `onOpenChange` is the only way state is reported back to the caller.
   */
  isOpen?: boolean;
  /** Called with the next open state whenever the disclosure toggles. */
  onOpenChange?: (open: boolean) => void;
  /**
   * Stable id for the controlled content region. When omitted a unique id is
   * generated so multiple disclosures on one page never collide.
   */
  id?: string;
}

/**
 * Encapsulates the accessible "disclosure" (show/hide) interaction so the ARIA
 * wiring and keyboard handling only have to be written — and tested — once.
 *
 * Supports both uncontrolled (`defaultOpen`) and controlled (`isOpen` +
 * `onOpenChange`) usage.
 */
export function useDisclosure(options: UseDisclosureOptions = {}): UseDisclosureResult {
  const { defaultOpen = false, isOpen: controlledOpen, onOpenChange, id } = options;

  const generatedId = useId();
  const contentId = id ?? `disclosure-${generatedId}`;

  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const open = useCallback(() => setOpen(true), [setOpen]);
  const close = useCallback(() => setOpen(false), [setOpen]);
  const toggle = useCallback(() => setOpen(!isOpen), [setOpen, isOpen]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        toggle();
      }
    },
    [toggle]
  );

  const triggerProps = useMemo<DisclosureTriggerProps>(
    () => ({
      role: 'button',
      tabIndex: 0,
      'aria-expanded': isOpen,
      'aria-controls': contentId,
      onClick: toggle,
      onKeyDown,
    }),
    [isOpen, contentId, toggle, onKeyDown]
  );

  const contentProps = useMemo<DisclosureContentProps>(
    () => ({ id: contentId }),
    [contentId]
  );

  return { isOpen, open, close, toggle, triggerProps, contentProps };
}

export default useDisclosure;
