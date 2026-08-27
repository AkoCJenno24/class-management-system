/**
 * Header component for the main app layout.
 * Shows page title and mobile menu toggle button.
 */
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

interface HeaderProps {
  title: string;
  onMenuToggle: () => void;
}

export function Header({ title, onMenuToggle }: HeaderProps) {
  return (
    <header className="flex h-16 items-center gap-4 border-b border-border bg-card/50 px-4 backdrop-blur-sm lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuToggle}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
    </header>
  );
}
