import { useEffect, useRef } from 'react';
import {
  FolderPlus,
  FileUp,
  FolderUp,
} from 'lucide-react';

interface DriveContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onNewFolder: () => void;
  onUploadFile: () => void;
  onUploadFolder: () => void;
}

export function DriveContextMenu({
  isOpen,
  position,
  onClose,
  onNewFolder,
  onUploadFile,
  onUploadFolder,
}: DriveContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Viewport containment: ensure the menu stays inside the viewport
  const menuWidth = 240;
  const menuHeight = 130;
  const safeX = Math.max(12, Math.min(position.x, window.innerWidth - menuWidth - 12));
  const safeY = Math.max(12, Math.min(position.y, window.innerHeight - menuHeight - 12));

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-50 w-[240px] rounded-xl border border-border/80 bg-popover/95 backdrop-blur-md shadow-2xl text-popover-foreground py-1.5 animate-in fade-in zoom-in-95 select-none"
      style={{ left: `${safeX}px`, top: `${safeY}px` }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 1. New Folder */}
      <button
        type="button"
        onClick={() => {
          onNewFolder();
          onClose();
        }}
        className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/80 transition-colors text-foreground cursor-pointer group"
      >
        <div className="flex items-center gap-2.5">
          <FolderPlus className="size-4 text-foreground/80 group-hover:text-primary transition-colors" />
          <span className="font-medium">New folder</span>
        </div>
        <span className="text-[11px] text-muted-foreground/80 font-mono">Alt+C then F</span>
      </button>

      <div className="h-px bg-border/70 my-1 mx-2" />

      {/* 2. File upload */}
      <button
        type="button"
        onClick={() => {
          onUploadFile();
          onClose();
        }}
        className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/80 transition-colors text-foreground cursor-pointer group"
      >
        <div className="flex items-center gap-2.5">
          <FileUp className="size-4 text-foreground/80 group-hover:text-emerald-500 transition-colors" />
          <span className="font-medium">File upload</span>
        </div>
        <span className="text-[11px] text-muted-foreground/80 font-mono">Alt+C then U</span>
      </button>

      {/* 3. Folder upload */}
      <button
        type="button"
        onClick={() => {
          onUploadFolder();
          onClose();
        }}
        className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/80 transition-colors text-foreground cursor-pointer group"
      >
        <div className="flex items-center gap-2.5">
          <FolderUp className="size-4 text-foreground/80 group-hover:text-blue-500 transition-colors" />
          <span className="font-medium">Folder upload</span>
        </div>
        <span className="text-[11px] text-muted-foreground/80 font-mono">Alt+C then I</span>
      </button>
    </div>
  );
}
