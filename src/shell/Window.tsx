import { useEffect, useRef, useState, type ReactNode } from 'react';

/** A label with StarView's mnemonic notation: "~Game" shows an underlined G. */
export function Label({ text }: { text: string }) {
  const i = text.indexOf('~');
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <u>{text[i + 1]}</u>
      {text.slice(i + 2)}
    </>
  );
}

const mnemonic = (text: string): string | undefined => text[text.indexOf('~') + 1]?.toLowerCase();

export type MenuItem =
  { label: string; shortcut?: string; disabled?: boolean; onSelect: () => void } | { separator: true };

export interface Menu {
  label: string;
  items: MenuItem[];
}

/**
 * A Windows 95 menu bar: click or Alt+mnemonic opens a menu, arrows and Enter pick an item.
 * `onOpenChange` tells whether a menu is pulled down (the real-time games pause meanwhile, as the
 * originals' timers do not run while a menu is open).
 */
export function MenuBar({ menus, onOpenChange }: { menus: Menu[]; onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const bar = useRef<HTMLDivElement>(null);
  const isOpen = open !== null;

  useEffect(() => onOpenChange?.(isOpen), [isOpen, onOpenChange]);

  const openMenu = (i: number) => {
    setOpen(i);
    setActive(menus[i]!.items.findIndex((it) => 'onSelect' in it && !it.disabled));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A modal dialog owns the keyboard.
      if (document.querySelector('.modal')) return;
      if (e.altKey && !e.ctrlKey) {
        const i = menus.findIndex((m) => mnemonic(m.label) === e.key.toLowerCase());
        if (i >= 0) {
          e.preventDefault();
          openMenu(i);
        }
        return;
      }
      if (open === null) return;
      const items = menus[open]!.items;
      const enabled = items.flatMap((it, i) => ('onSelect' in it && !it.disabled ? [i] : []));
      const pick = (it: MenuItem | undefined) => {
        if (it && 'onSelect' in it && !it.disabled) {
          setOpen(null);
          it.onSelect();
        }
      };
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.key === 'Escape') setOpen(null);
      else if (e.key === 'ArrowLeft') openMenu((open + menus.length - 1) % menus.length);
      else if (e.key === 'ArrowRight') openMenu((open + 1) % menus.length);
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const at = enabled.indexOf(active);
        const step = e.key === 'ArrowDown' ? 1 : enabled.length - 1;
        setActive(enabled[(at + step) % enabled.length] ?? active);
      } else if (e.key === 'Enter') pick(items[active]);
      else pick(items.find((it) => 'label' in it && mnemonic(it.label) === e.key.toLowerCase()));
    };
    const onPointer = (e: PointerEvent) => {
      if (!bar.current?.contains(e.target as Node)) setOpen(null);
    };
    // Capture: the menu sees keys before the game does.
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onPointer);
    };
  });

  return (
    <div className="menubar" ref={bar} role="menubar">
      {menus.map((menu, i) => (
        <div key={menu.label} className="menu">
          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={open === i}
            className={open === i ? 'open' : undefined}
            onClick={() => (open === i ? setOpen(null) : openMenu(i))}
            onPointerEnter={() => open !== null && open !== i && openMenu(i)}
          >
            <Label text={menu.label} />
          </button>
          {open === i && (
            <ul className="dropdown" role="menu">
              {menu.items.map((it, j) =>
                'separator' in it ? (
                  <li key={j} className="separator" role="separator" />
                ) : (
                  <li
                    key={j}
                    role="menuitem"
                    aria-disabled={it.disabled}
                    className={j === active ? 'active' : undefined}
                    onPointerEnter={() => setActive(j)}
                    onClick={() => {
                      if (it.disabled) return;
                      setOpen(null);
                      it.onSelect();
                    }}
                  >
                    <span>
                      <Label text={it.label} />
                    </span>
                    {it.shortcut && <span className="shortcut">{it.shortcut}</span>}
                  </li>
                ),
              )}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

/** A Windows 95 application window: title bar, optional menu bar, content. */
export function Window(props: {
  title: string;
  icon: string;
  menus?: Menu[];
  /** Called when a menu is pulled down (true) or closed (false). */
  onMenuChange?: (open: boolean) => void;
  onClose?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`window ${props.className ?? ''}`} aria-label={props.title}>
      <header className="titlebar">
        <img src={props.icon} alt="" width={16} height={16} />
        <h1>{props.title}</h1>
        {props.onClose && (
          <button type="button" className="close" aria-label="Close" onClick={props.onClose}>
            ×
          </button>
        )}
      </header>
      {props.menus && <MenuBar menus={props.menus} onOpenChange={props.onMenuChange} />}
      <div className="window-body">{props.children}</div>
    </section>
  );
}
