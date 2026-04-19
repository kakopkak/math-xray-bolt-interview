'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import styles from './landing-page.module.css';

type MenuItem = {
  label: string;
  href?: string;
  onSelect?: () => void;
};

type LandingMenuProps = {
  navigateItems: MenuItem[];
  actionItems: MenuItem[];
};

function MenuItemLink({
  item,
  onSelect,
}: {
  item: MenuItem;
  onSelect: () => void;
}) {
  if (item.href) {
    return (
      <Link href={item.href} className={styles.menuLink} onClick={onSelect}>
        <span>{item.label}</span>
        <span className={styles.menuLinkArrow} aria-hidden="true">
          ↗
        </span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={styles.menuLinkButton}
      onClick={() => {
        item.onSelect?.();
        onSelect();
      }}
    >
      <span>{item.label}</span>
      <span className={styles.menuLinkArrow} aria-hidden="true">
        →
      </span>
    </button>
  );
}

export function LandingMenu({ navigateItems, actionItems }: LandingMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }

      setIsOpen(false);
      triggerRef.current?.focus();
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target || dockRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    }

    function handleScroll() {
      setIsOpen(false);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isOpen]);

  return (
    <div ref={dockRef} className={styles.menuDock}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`${styles.menuButton} ${isOpen ? styles.menuButtonActive : ''}`}
        aria-label="Ava navigeerimismenüü"
        aria-expanded={isOpen}
        aria-controls="landing-menu-panel"
      >
        <span className={styles.menuButtonLine} />
        <span className={styles.menuButtonLine} />
      </button>

      <div
        id="landing-menu-panel"
        className={`${styles.menuPanel} ${isOpen ? styles.menuPanelOpen : ''}`}
        aria-hidden={isOpen ? undefined : true}
      >
        <nav className={styles.menuSurface} aria-label="Lehe navigeerimine">
          <div className={styles.menuGrid}>
            <section className={styles.menuGroup} aria-labelledby="landing-menu-jump-label">
              <p id="landing-menu-jump-label" className={styles.menuGroupLabel}>
                Liigu
              </p>
              <ul className={styles.menuList}>
                {navigateItems.map((item) => (
                  <li key={`${item.label}-${item.href ?? 'action'}`}>
                    <MenuItemLink item={item} onSelect={() => setIsOpen(false)} />
                  </li>
                ))}
              </ul>
            </section>

            <section className={styles.menuGroup} aria-labelledby="landing-menu-open-label">
              <p id="landing-menu-open-label" className={styles.menuGroupLabel}>
                Ava
              </p>
              <ul className={styles.menuList}>
                {actionItems.map((item) => (
                  <li key={`${item.label}-${item.href ?? 'action'}`}>
                    <MenuItemLink item={item} onSelect={() => setIsOpen(false)} />
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </nav>
      </div>
    </div>
  );
}
