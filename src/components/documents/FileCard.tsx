import { useState } from 'react';
import { type DocFile } from '@/types';
import {
  MoreVertical,
  Download,
  Eye,
  Pencil,
  FolderInput,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  formatBytes,
  getFileCategory,
  getFileBadgeLabel,
  FILE_CATEGORY_STYLES,
  isFilePreviewable,
} from './document-utils';

interface FileCardProps {
  file: DocFile;
  onPreview: (file: DocFile) => void;
  onDownload: (file: DocFile) => void;
  onRename: (file: DocFile) => void;
  onMove: (file: DocFile) => void;
  onDelete: (file: DocFile) => void;
}

export function FileCard({
  file,
  onPreview,
  onDownload,
  onRename,
  onMove,
  onDelete,
}: FileCardProps) {
  const [imageError, setImageError] = useState(false);
  const fileExt = file.fileExtension || file.name;
  const category = getFileCategory(fileExt, file.mimeType);
  const badgeLabel = getFileBadgeLabel(fileExt, file.mimeType);
  const style = FILE_CATEGORY_STYLES[category];
  const Icon = style.icon;
  const canPreview = isFilePreviewable(fileExt, file.mimeType);

  const handleClick = () => {
    if (canPreview) {
      onPreview(file);
    } else {
      onDownload(file);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="group relative flex flex-col rounded-xl border border-border bg-card/70 hover:bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer select-none"
    >
      {/* Thumbnail or File Header Area */}
      <div className="relative h-32 sm:h-36 w-full bg-muted/40 flex items-center justify-center overflow-hidden border-b border-border/60">
        {category === 'image' && !imageError ? (
          <img
            src={file.downloadUrl}
            alt={file.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4">
            <div className={`size-14 rounded-2xl flex items-center justify-center shadow-xs transition-transform duration-200 group-hover:scale-110 ${style.bgColor} ${style.textColor}`}>
              <Icon className="size-7 stroke-[1.75]" />
            </div>
          </div>
        )}

        {/* Category Badge */}
        <Badge
          variant="outline"
          className={`absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0 shadow-xs backdrop-blur-xs ${style.badgeBg} ${style.badgeBorder}`}
        >
          {badgeLabel}
        </Badge>
      </div>

      {/* Info & Menu Bar */}
      <div className="p-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className="font-medium text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors leading-tight"
            title={file.name}
          >
            {file.name}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
            <span>{formatBytes(file.size)}</span>
            <span>•</span>
            <span>{file.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>

        {/* 3-dots Menu */}
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity -mr-1"
              title="File options"
            />}><MoreVertical className="size-3.5" /></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {canPreview && (
                <DropdownMenuItem onClick={() => onPreview(file)} className="gap-2 cursor-pointer">
                  <Eye className="size-4 text-muted-foreground" />
                  <span>Preview</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDownload(file)} className="gap-2 cursor-pointer">
                <Download className="size-4 text-muted-foreground" />
                <span>Download</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRename(file)} className="gap-2 cursor-pointer">
                <Pencil className="size-4 text-muted-foreground" />
                <span>Rename</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMove(file)} className="gap-2 cursor-pointer">
                <FolderInput className="size-4 text-muted-foreground" />
                <span>Move to...</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(file)}
                className="gap-2 text-destructive focus:text-destructive cursor-pointer"
              >
                <Trash2 className="size-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
