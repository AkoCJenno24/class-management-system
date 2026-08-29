import { type DocFolder, type DocFile } from '@/types';
import {
  Folder,
  MoreVertical,
  Download,
  Eye,
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
import { Badge } from '@/components/ui/badge';
import {
  formatBytes,
  getFileCategory,
  getFileBadgeLabel,
  FILE_CATEGORY_STYLES,
  isFilePreviewable,
} from './document-utils';

interface DocumentsListViewProps {
  folders: DocFolder[];
  files: DocFile[];
  folderItemCounts: Record<string, number>;
  onOpenFolder: (folder: DocFolder) => void;
  onRenameFolder: (folder: DocFolder) => void;
  onMoveFolder: (folder: DocFolder) => void;
  onDeleteFolder: (folder: DocFolder) => void;
  onPreviewFile: (file: DocFile) => void;
  onDownloadFile: (file: DocFile) => void;
  onRenameFile: (file: DocFile) => void;
  onMoveFile: (file: DocFile) => void;
  onDeleteFile: (file: DocFile) => void;
}

export function DocumentsListView({
  folders,
  files,
  folderItemCounts,
  onOpenFolder,
  onRenameFolder,
  onMoveFolder,
  onDeleteFolder,
  onPreviewFile,
  onDownloadFile,
  onRenameFile,
  onMoveFile,
  onDeleteFile,
}: DocumentsListViewProps) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border bg-card/60">
      <table className="w-full text-left text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold text-xs select-none">
            <th className="py-2.5 px-4">Name</th>
            <th className="py-2.5 px-4 hidden sm:table-cell">Type</th>
            <th className="py-2.5 px-4 hidden md:table-cell">Size</th>
            <th className="py-2.5 px-4 hidden lg:table-cell">Last Modified</th>
            <th className="py-2.5 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {/* Folders */}
          {folders.map((folder) => {
            const count = folderItemCounts[folder.id] || 0;
            const color = folder.color || '#3B82F6';
            return (
              <tr
                key={`folder-${folder.id}`}
                onClick={() => onOpenFolder(folder)}
                className="group hover:bg-muted/40 transition-colors cursor-pointer select-none"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="size-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${color}18` }}
                    >
                      <Folder className="size-4.5 fill-current" style={{ color }} />
                    </div>
                    <span className="font-medium text-foreground truncate max-w-[180px] sm:max-w-xs md:max-w-sm group-hover:text-primary transition-colors">
                      {folder.name}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 hidden sm:table-cell">
                  <span className="text-xs text-muted-foreground">Folder</span>
                </td>
                <td className="py-3 px-4 hidden md:table-cell">
                  <span className="text-xs text-muted-foreground">
                    {count} {count === 1 ? 'item' : 'items'}
                  </span>
                </td>
                <td className="py-3 px-4 hidden lg:table-cell">
                  <span className="text-xs text-muted-foreground">
                    {folder.updatedAt.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </td>
                <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
                    />}><MoreVertical className="size-4" /></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => onOpenFolder(folder)} className="gap-2 cursor-pointer">
                        <FolderOpen className="size-4 text-muted-foreground" />
                        <span>Open</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onRenameFolder(folder)} className="gap-2 cursor-pointer">
                        <Pencil className="size-4 text-muted-foreground" />
                        <span>Rename</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onMoveFolder(folder)} className="gap-2 cursor-pointer">
                        <FolderInput className="size-4 text-muted-foreground" />
                        <span>Move to...</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDeleteFolder(folder)}
                        className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                      >
                        <Trash2 className="size-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}

          {/* Files */}
          {files.map((file) => {
            const fileExt = file.fileExtension || file.name;
            const category = getFileCategory(fileExt, file.mimeType);
            const badgeLabel = getFileBadgeLabel(fileExt, file.mimeType);
            const style = FILE_CATEGORY_STYLES[category];
            const Icon = style.icon;
            const canPreview = isFilePreviewable(fileExt, file.mimeType);

            return (
              <tr
                key={`file-${file.id}`}
                onClick={() => (canPreview ? onPreviewFile(file) : onDownloadFile(file))}
                className="group hover:bg-muted/40 transition-colors cursor-pointer select-none"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${style.bgColor} ${style.textColor}`}>
                      <Icon className="size-4.5" />
                    </div>
                    <span className="font-medium text-foreground truncate max-w-[180px] sm:max-w-xs md:max-w-sm group-hover:text-primary transition-colors">
                      {file.name}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 hidden sm:table-cell">
                  <Badge variant="outline" className={`text-[10px] uppercase font-semibold px-1.5 py-0 ${style.badgeBg} ${style.badgeBorder}`}>
                    {badgeLabel}
                  </Badge>
                </td>
                <td className="py-3 px-4 hidden md:table-cell">
                  <span className="text-xs text-muted-foreground">
                    {formatBytes(file.size)}
                  </span>
                </td>
                <td className="py-3 px-4 hidden lg:table-cell">
                  <span className="text-xs text-muted-foreground">
                    {file.createdAt.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </td>
                <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDownloadFile(file)}
                      className="size-8 text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
                      title="Download"
                    >
                      <Download className="size-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
                      />}><MoreVertical className="size-4" /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {canPreview && (
                          <DropdownMenuItem onClick={() => onPreviewFile(file)} className="gap-2 cursor-pointer">
                            <Eye className="size-4 text-muted-foreground" />
                            <span>Preview</span>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onDownloadFile(file)} className="gap-2 cursor-pointer">
                          <Download className="size-4 text-muted-foreground" />
                          <span>Download</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRenameFile(file)} className="gap-2 cursor-pointer">
                          <Pencil className="size-4 text-muted-foreground" />
                          <span>Rename</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onMoveFile(file)} className="gap-2 cursor-pointer">
                          <FolderInput className="size-4 text-muted-foreground" />
                          <span>Move to...</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDeleteFile(file)}
                          className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="size-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
