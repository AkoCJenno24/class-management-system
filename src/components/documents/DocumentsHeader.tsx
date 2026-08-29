import React, { useRef } from 'react';
import { type DocFolder } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  FolderPlus,
  UploadCloud,
  Search,
  X,
  LayoutGrid,
  List,
  ChevronRight,
  HardDrive,
  Folder,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'grid' | 'list';
export type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'date-desc'
  | 'date-asc'
  | 'size-desc'
  | 'size-asc';

interface DocumentsHeaderProps {
  breadcrumbs: { id: string | null; name: string }[];
  currentFolder: DocFolder | null;
  onNavigateFolder: (folderId: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onNewFolderClick: () => void;
  onUploadFiles: (files: FileList) => void;
  onUploadFolder?: (files: FileList) => void;
}

export function DocumentsHeader({
  breadcrumbs,
  currentFolder,
  onNavigateFolder,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  onNewFolderClick,
  onUploadFiles,
  onUploadFolder,
}: DocumentsHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onUploadFolder) {
      onUploadFolder(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4 pb-2">
      {/* Top action and search bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: + New button and Hidden File & Folder Inputs */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={folderInputRef}
            type="file"
            // @ts-expect-error webkitdirectory is standard for folder picking
            webkitdirectory=""
            directory=""
            multiple
            className="hidden"
            onChange={handleFolderSelect}
          />

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button className="gap-2 shadow-xs cursor-pointer h-9 px-3.5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
              <Plus className="size-4 stroke-[2.5]" />
              <span>New</span>
            </Button>} />
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem
                onClick={onNewFolderClick}
                className="gap-2.5 py-2 cursor-pointer font-medium"
              >
                <FolderPlus className="size-4 text-blue-500" />
                <div className="flex items-center justify-between flex-1">
                  <span>New folder</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Alt+C then F</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => fileInputRef.current?.click()}
                className="gap-2.5 py-2 cursor-pointer font-medium"
              >
                <UploadCloud className="size-4 text-emerald-500" />
                <div className="flex items-center justify-between flex-1">
                  <span>File upload</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Alt+C then U</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => folderInputRef.current?.click()}
                className="gap-2.5 py-2 cursor-pointer font-medium"
              >
                <Folder className="size-4 text-amber-500" />
                <div className="flex items-center justify-between flex-1">
                  <span>Folder upload</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Alt+C then I</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Direct quick upload button on medium screens */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="hidden md:flex gap-1.5 h-9 text-xs border-border"
          >
            <UploadCloud className="size-3.5 text-muted-foreground" />
            <span>Upload</span>
          </Button>
        </div>

        {/* Right: Search, Sort & View Mode */}
        <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
          {/* Search box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search in documents..."
              className="h-9 pl-8 pr-8 text-xs bg-muted/30 focus-visible:bg-background"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={(val) => onSortChange(val as SortOption)}>
            <SelectTrigger className="h-9 w-auto min-w-[36px] sm:min-w-[130px] px-2.5 text-xs">
              <ArrowUpDown className="size-3.5 text-muted-foreground sm:mr-1 shrink-0" />
              <span className="hidden sm:inline">
                <SelectValue placeholder="Sort by" />
              </span>
            </SelectTrigger>
            <SelectContent align="end" className="text-xs">
              <SelectItem value="name-asc">Name (A to Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z to A)</SelectItem>
              <SelectItem value="date-desc">Newest First</SelectItem>
              <SelectItem value="date-asc">Oldest First</SelectItem>
              <SelectItem value="size-desc">Size (Largest)</SelectItem>
              <SelectItem value="size-asc">Size (Smallest)</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onViewModeChange('grid')}
              className={cn(
                'size-8 rounded-md transition-all',
                viewMode === 'grid'
                  ? 'bg-background shadow-2xs text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Grid View"
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onViewModeChange('list')}
              className={cn(
                'size-8 rounded-md transition-all',
                viewMode === 'list'
                  ? 'bg-background shadow-2xs text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="List View"
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Interactive Google Drive Breadcrumbs Bar */}
      <div className="flex items-center gap-1.5 py-1 px-1 text-xs text-muted-foreground overflow-x-auto select-none no-scrollbar">
        <button
          type="button"
          onClick={() => onNavigateFolder(null)}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/70 hover:text-foreground transition-colors cursor-pointer shrink-0',
            currentFolder === null && 'font-semibold text-foreground bg-muted/40'
          )}
        >
          <HardDrive className="size-3.5" />
          <span>My Documents</span>
        </button>

        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <React.Fragment key={crumb.id || 'root'}>
              <ChevronRight className="size-3.5 text-muted-foreground/60 shrink-0" />
              <button
                type="button"
                onClick={() => onNavigateFolder(crumb.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/70 hover:text-foreground transition-colors cursor-pointer shrink-0 max-w-[160px] sm:max-w-[220px]',
                  isLast ? 'font-semibold text-foreground bg-muted/40' : 'text-muted-foreground'
                )}
                title={crumb.name}
              >
                <Folder className="size-3.5 shrink-0 fill-current/20 text-blue-500" />
                <span className="truncate">{crumb.name}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
