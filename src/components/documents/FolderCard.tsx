import { type DocFolder } from '@/types';
import {
  Folder,
  MoreVertical,
  Pencil,
  FolderInput,
  Trash2,
  FolderOpen,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface FolderCardProps {
  folder: DocFolder;
  itemCount: number;
  onOpen: (folder: DocFolder) => void;
  onRename: (folder: DocFolder) => void;
  onMove: (folder: DocFolder) => void;
  onDelete: (folder: DocFolder) => void;
}

export function FolderCard({
  folder,
  itemCount,
  onOpen,
  onRename,
  onMove,
  onDelete,
}: FolderCardProps) {
  const folderColor = folder.color || '#3B82F6';

  return (
    <div
      onClick={() => onOpen(folder)}
      className="group relative flex items-center justify-between p-3.5 rounded-xl border border-border bg-card/60 hover:bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer select-none"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
        <div
          className="size-10 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
          style={{ backgroundColor: `${folderColor}18` }}
        >
          <Folder
            className="size-5.5 fill-current"
            style={{ color: folderColor }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors"
            title={folder.name}
          >
            {folder.name}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </p>
        </div>
      </div>

      {/* 3-dots Menu */}
      <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
            title="Folder options"
          />}><MoreVertical className="size-4" /></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onOpen(folder)} className="gap-2 cursor-pointer">
              <FolderOpen className="size-4 text-muted-foreground" />
              <span>Open</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRename(folder)} className="gap-2 cursor-pointer">
              <Pencil className="size-4 text-muted-foreground" />
              <span>Rename</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove(folder)} className="gap-2 cursor-pointer">
              <FolderInput className="size-4 text-muted-foreground" />
              <span>Move to...</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(folder)}
              className="gap-2 text-destructive focus:text-destructive cursor-pointer"
            >
              <Trash2 className="size-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
