import { useEffect, useRef, useState, type ReactNode } from 'react';
import spiralEnd from '../assets/shared/spiral-end.png';
import spiral from '../assets/shared/spiral.png';
import { Label } from './Window.tsx';

export interface DialogButton {
  label: string;
  onClick: () => void;
  /** Triggered by Enter. */
  primary?: boolean;
  /** Triggered by Escape and the close box. */
  cancel?: boolean;
}

/** Open dialogs, innermost last: only that one handles the keyboard. */
const stack: object[] = [];

/** The icons of StarView's message boxes (InfoBox, WarningBox, ErrorBox, QueryBox). */
export type MessageIcon = 'info' | 'warning' | 'error' | 'question';

/** A row of dialog buttons (the primary one, Enter's, gets the focus); `className` places it. */
export function DialogButtons({ buttons, className }: { buttons: DialogButton[]; className?: string }) {
  return (
    <div className={className ?? 'dialog-buttons'}>
      {buttons.map((b) => (
        <button key={b.label} type="button" className={b.primary ? 'primary' : undefined} onClick={b.onClick}>
          <Label text={b.label} />
        </button>
      ))}
    </div>
  );
}

/** A modal Windows 95 dialog over the game window. */
export function Dialog(props: {
  title: string;
  buttons: DialogButton[];
  className?: string;
  /** A message box: the children are its text, after this icon. */
  icon?: MessageIcon;
  /** No title bar (CZGAME32.DLL's end-of-game dialogs); `title` still names the dialog. */
  untitled?: boolean;
  /**
   * No button row under the body: the children place the buttons themselves (with
   * `DialogButtons`). Enter, Escape and the buttons' roles work as with a footer.
   */
  noFooter?: boolean;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [id] = useState(() => ({}));
  const { buttons } = props;

  useEffect(() => {
    stack.push(id);
    const previous = document.activeElement as HTMLElement | null;
    const first = box.current?.querySelector<HTMLElement>('[autofocus], input, .primary');
    first?.focus();
    return () => {
      stack.splice(stack.indexOf(id), 1);
      previous?.focus();
    };
  }, [id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (stack.at(-1) !== id) return;
      const target = e.target as HTMLElement;
      if (e.key === 'Escape') buttons.find((b) => b.cancel)?.onClick();
      else if (e.key === 'Enter' && target.closest('[role="listbox"]')) return;
      else if (e.key === 'Enter' && target.tagName !== 'BUTTON') buttons.find((b) => b.primary)?.onClick();
      else if (e.key !== 'Tab') return;
      else {
        // Keep the focus inside the dialog.
        const focusable = [
          ...(box.current?.querySelectorAll<HTMLElement>('button, input, select, [tabindex="0"]') ?? []),
        ];
        const at = focusable.indexOf(target);
        const next = focusable[(at + (e.shiftKey ? focusable.length - 1 : 1)) % focusable.length];
        next?.focus();
      }
      e.preventDefault();
      // The game under the dialog must not see the keys.
      e.stopImmediatePropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [buttons, id]);

  const cancel = buttons.find((b) => b.cancel);
  return (
    <div className="modal">
      <div
        className={`window dialog ${props.className ?? ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        ref={box}
      >
        {!props.untitled && (
          <header className="titlebar">
            <h1>{props.title}</h1>
            {cancel && (
              <button type="button" className="close" aria-label="Close" onClick={cancel.onClick}>
                ×
              </button>
            )}
          </header>
        )}
        <div className="dialog-body">
          {props.icon ? <p className={`message ${props.icon}`}>{props.children}</p> : props.children}
        </div>
        {!props.noFooter && <DialogButtons buttons={buttons} />}
      </div>
    </div>
  );
}

/** The spiral notebook of the games' options dialogs: tabs on top, rings along the bottom. */
export function Notebook({ tabs }: { tabs: { label: string; content: ReactNode }[] }) {
  const [current, setCurrent] = useState(0);
  return (
    <div className="notebook">
      <div className="tabs" role="tablist">
        {tabs.map((t, i) => (
          <button key={t.label} type="button" role="tab" aria-selected={i === current} onClick={() => setCurrent(i)}>
            <Label text={t.label} />
          </button>
        ))}
      </div>
      <div className="page" role="tabpanel">
        {tabs[current]?.content}
      </div>
      <div
        className="rings"
        aria-hidden="true"
        style={{ '--ring': `url(${spiral})`, '--ring-end': `url(${spiralEnd})` } as React.CSSProperties}
      />
    </div>
  );
}

/** A Windows 95 list box (single selection); `onActivate` on double-click or Enter. */
export function ListBox(props: {
  items: string[];
  selected: number;
  onSelect: (i: number) => void;
  onActivate?: (i: number) => void;
  label: string;
  rows?: number;
  /** Greyed out: no selection by mouse or keyboard. */
  disabled?: boolean;
}) {
  const { items, selected, onSelect, onActivate, disabled } = props;
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => {
    list.current?.children[selected]?.scrollIntoView({ block: 'nearest' });
  }, [selected]);
  return (
    <ul
      className="listbox"
      role="listbox"
      aria-label={props.label}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      ref={list}
      style={{ height: `calc(${(props.rows ?? 8) * 1.25}em + 4px)` }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'ArrowDown') onSelect(Math.min(items.length - 1, selected + 1));
        else if (e.key === 'ArrowUp') onSelect(Math.max(0, selected - 1));
        else if (e.key === 'Enter' && onActivate) onActivate(selected);
        else return;
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
    >
      {items.map((item, i) => (
        <li
          key={item}
          role="option"
          aria-selected={i === selected}
          onClick={() => !disabled && onSelect(i)}
          onDoubleClick={() => !disabled && onActivate?.(i)}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
