import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type DocFile } from '@/types';
import {
  formatBytes,
  getFileCategory,
  getFileBadgeLabel,
  FILE_CATEGORY_STYLES,
} from './document-utils';
import { Download, ExternalLink, FileQuestion } from 'lucide-react';

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: DocFile | null;
  onDownload: (file: DocFile) => void;
}

export function FilePreviewDialog({
  open,
  onOpenChange,
  file,
  onDownload,
}: FilePreviewDialogProps) {
  if (!file) return null;

  const fileExt = file.fileExtension || file.name;
  const category = getFileCategory(fileExt, file.mimeType);
  const badgeLabel = getFileBadgeLabel(fileExt, file.mimeType);
  const style = FILE_CATEGORY_STYLES[category];
  const Icon = style.icon;

  const renderContent = () => {
    switch (category) {
      case 'image':
        return (
          <div className="flex items-center justify-center p-4 min-h-[300px] max-h-[70vh] bg-black/5 dark:bg-black/40 rounded-lg overflow-hidden">
            <img
              src={file.downloadUrl}
              alt={file.name}
              className="max-h-[65vh] max-w-full object-contain rounded shadow-sm"
              loading="lazy"
            />
          </div>
        );

      case 'pdf':
        return (
          <div className="w-full h-[65vh] rounded-lg overflow-hidden border border-border bg-muted/20">
            <iframe
              src={`${file.downloadUrl}#toolbar=1`}
              title={file.name}
              className="w-full h-full border-0"
            />
          </div>
        );

      case 'video':
        return (
          <div className="flex items-center justify-center p-4 bg-black/80 rounded-lg overflow-hidden">
            <video
              src={file.downloadUrl}
              controls
              className="max-h-[60vh] max-w-full rounded"
            >
              Your browser does not support HTML video.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className="flex flex-col items-center justify-center p-8 bg-muted/30 rounded-lg space-y-4">
            <div className="size-16 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-600">
              <Icon className="size-8" />
            </div>
            <p className="font-medium text-sm text-foreground">{file.name}</p>
            <audio src={file.downloadUrl} controls className="w-full max-w-md">
              Your browser does not support HTML audio.
            </audio>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4 bg-muted/20 rounded-lg border border-dashed border-border">
            <div className="size-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
              <FileQuestion className="size-8 stroke-[1.5]" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">
                Preview not available for this file type
              </p>
              <p className="text-xs text-muted-foreground max-w-md">
                You can download the file to view it on your device or open it in a new browser tab.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button onClick={() => onDownload(file)} className="gap-2">
                <Download className="size-4" />
                Download File ({formatBytes(file.size)})
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(file.downloadUrl, '_blank', 'noopener,noreferrer')}
                className="gap-2"
              >
                <ExternalLink className="size-4" />
                Open in Tab
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between gap-4 pb-2 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${style.bgColor} ${style.textColor}`}>
              <Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base truncate max-w-[260px] sm:max-w-md md:max-w-lg">
                {file.name}
              </DialogTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <Badge variant="outline" className={`text-[10px] uppercase px-1.5 py-0 ${style.badgeBg} ${style.badgeBorder}`}>
                  {badgeLabel}
                </Badge>
                <span>•</span>
                <span>{formatBytes(file.size)}</span>
                <span>•</span>
                <span>{file.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(file.downloadUrl, '_blank', 'noopener,noreferrer')}
              title="Open in new tab"
              className="h-8 gap-1.5 text-xs hidden xs:flex"
            >
              <ExternalLink className="size-3.5" />
              <span>Open</span>
            </Button>
            <Button
              size="sm"
              onClick={() => onDownload(file)}
              title="Download file"
              className="h-8 gap-1.5 text-xs"
            >
              <Download className="size-3.5" />
              <span className="hidden xs:inline">Download</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pt-4">{renderContent()}</div>
      </DialogContent>
    </Dialog>
  );
}
