import clsx from 'clsx';
import { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

/**
 * This component is a simple page layout component to help with design consistency
 * Feel free to modify this component to fit your needs
 */
export const Page = (props: { children: ReactNode; className?: string }) => {
  return (
    <div
      className={twMerge(
        clsx(
          'flex min-h-full flex-col bg-[var(--color-bg-base)] text-[var(--color-text-primary)]',
          props.className,
        ),
      )}
    >
      {props.children}
    </div>
  );
};

const Header = (props: { children: ReactNode; className?: string }) => {
  return (
    <header
      className={twMerge(
        'flex flex-col justify-center gap-3 px-6 pt-6 pb-5 z-10 bg-[var(--color-bg-base)]',
        clsx(props.className),
      )}
    >
      {props.children}
    </header>
  );
};

const Main = (props: { children: ReactNode; className?: string }) => {
  return (
    <main
      className={twMerge(
        clsx(
          'grow overflow-y-auto px-6 py-6 bg-[var(--color-bg-base)] text-[var(--color-text-secondary)]',
          props.className,
        ),
      )}
    >
      {props.children}
    </main>
  );
};

const Footer = (props: { children: ReactNode; className?: string }) => {
  return (
    <footer
      className={twMerge(
        'px-6 pb-6 pt-4 border-t border-[color-mix(in srgb,var(--color-divider-low) 45%,transparent)] bg-[var(--color-bg-base)]',
        clsx(props.className),
      )}
    >
      {props.children}
    </footer>
  );
};

Page.Header = Header;
Page.Main = Main;
Page.Footer = Footer;
