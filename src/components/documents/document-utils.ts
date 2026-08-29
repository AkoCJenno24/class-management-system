import React from 'react';
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  FileCode,
  FileArchive,
  FileAudio,
  FileVideo,
  File,
  Presentation,
} from 'lucide-react';

/** Format byte size into human readable string */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export type FileCategory =
  | 'pdf'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'image'
  | 'video'
  | 'audio'
  | 'archive'
  | 'code'
  | 'other';

/** Categorizes file by extension and mimeType */
export function getFileCategory(extOrFilename: string, mimeType = ''): FileCategory {
  let extension = (extOrFilename || '').toLowerCase().trim();
  if (extension.includes('.')) {
    extension = extension.split('.').pop() || '';
  }
  extension = extension.replace(/^\./, '');
  const mime = (mimeType || '').toLowerCase().trim();

  // 1. High-priority exact extension checks
  if (['xls', 'xlsx', 'xlsm', 'xlsb', 'xlt', 'xltx', 'csv', 'tsv', 'ods'].includes(extension)) {
    return 'spreadsheet';
  }
  if (['doc', 'docx', 'docm', 'dot', 'dotx', 'odt', 'rtf'].includes(extension)) {
    return 'document';
  }
  if (['ppt', 'pptx', 'pptm', 'pot', 'potx', 'pps', 'ppsx', 'odp'].includes(extension)) {
    return 'presentation';
  }
  if (extension === 'pdf') {
    return 'pdf';
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif', 'heic', 'avif'].includes(extension)) {
    return 'image';
  }
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv', 'm4v', '3gp', 'ogv'].includes(extension)) {
    return 'video';
  }
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma', 'aiff', 'opus', 'mid', 'midi'].includes(extension)) {
    return 'audio';
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', 'tgz'].includes(extension)) {
    return 'archive';
  }
  if (['js', 'jsx', 'ts', 'tsx', 'html', 'htm', 'css', 'scss', 'sass', 'less', 'json', 'py', 'java', 'c', 'cpp', 'cs', 'h', 'hpp', 'rs', 'go', 'php', 'sql', 'md', 'xml', 'yaml', 'yml', 'sh', 'bat', 'cmd'].includes(extension)) {
    return 'code';
  }

  // 2. MIME type fallbacks (Never check generic 'document' because OpenXML mimes contain 'officedocument')
  if (mime.includes('pdf')) return 'pdf';
  if (
    mime.includes('spreadsheet') ||
    mime.includes('ms-excel') ||
    mime.includes('excel') ||
    mime.includes('sheet') ||
    mime.includes('csv') ||
    mime.includes('tab-separated')
  ) {
    return 'spreadsheet';
  }
  if (
    mime.includes('presentation') ||
    mime.includes('powerpoint') ||
    mime.includes('presentationml')
  ) {
    return 'presentation';
  }
  if (
    mime.includes('wordprocessingml') ||
    mime.includes('msword') ||
    mime.includes('opendocument.text') ||
    mime.includes('word') ||
    mime.includes('rtf')
  ) {
    return 'document';
  }
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (
    mime.includes('zip') ||
    mime.includes('compressed') ||
    mime.includes('tar') ||
    mime.includes('7z') ||
    mime.includes('archive')
  ) {
    return 'archive';
  }
  if (
    mime.includes('javascript') ||
    mime.includes('typescript') ||
    mime.includes('json') ||
    mime.includes('xml') ||
    mime.includes('html') ||
    mime.includes('css')
  ) {
    return 'code';
  }

  return 'other';
}

/** Color theme configuration for file types */
export interface FileTypeStyle {
  label: string;
  icon: React.ElementType;
  textColor: string;
  bgColor: string;
  badgeBg: string;
  badgeBorder: string;
}

export const FILE_CATEGORY_STYLES: Record<FileCategory, FileTypeStyle> = {
  pdf: {
    label: 'PDF',
    icon: FileText,
    textColor: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500/10 dark:bg-red-500/15',
    badgeBg: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    badgeBorder: 'border-red-200 dark:border-red-800/40',
  },
  document: {
    label: 'Word',
    icon: FileText,
    textColor: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10 dark:bg-blue-500/15',
    badgeBg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    badgeBorder: 'border-blue-200 dark:border-blue-800/40',
  },
  spreadsheet: {
    label: 'Excel',
    icon: FileSpreadsheet,
    textColor: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    badgeBorder: 'border-emerald-200 dark:border-emerald-800/40',
  },
  presentation: {
    label: 'PowerPoint',
    icon: Presentation,
    textColor: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10 dark:bg-amber-500/15',
    badgeBg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    badgeBorder: 'border-amber-200 dark:border-amber-800/40',
  },
  image: {
    label: 'Image',
    icon: FileImage,
    textColor: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10 dark:bg-purple-500/15',
    badgeBg: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
    badgeBorder: 'border-purple-200 dark:border-purple-800/40',
  },
  video: {
    label: 'Video',
    icon: FileVideo,
    textColor: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-500/10 dark:bg-rose-500/15',
    badgeBg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    badgeBorder: 'border-rose-200 dark:border-rose-800/40',
  },
  audio: {
    label: 'Audio',
    icon: FileAudio,
    textColor: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-500/10 dark:bg-violet-500/15',
    badgeBg: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
    badgeBorder: 'border-violet-200 dark:border-violet-800/40',
  },
  archive: {
    label: 'Archive',
    icon: FileArchive,
    textColor: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10 dark:bg-orange-500/15',
    badgeBg: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
    badgeBorder: 'border-orange-200 dark:border-orange-800/40',
  },
  code: {
    label: 'Code',
    icon: FileCode,
    textColor: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-500/10 dark:bg-cyan-500/15',
    badgeBg: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
    badgeBorder: 'border-cyan-200 dark:border-cyan-800/40',
  },
  other: {
    label: 'File',
    icon: File,
    textColor: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-500/10 dark:bg-slate-500/15',
    badgeBg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    badgeBorder: 'border-slate-200 dark:border-slate-700',
  },
};

/** Checks if a file type can be rendered in the preview modal */
export function isFilePreviewable(ext: string, mimeType = ''): boolean {
  const category = getFileCategory(ext, mimeType);
  return ['image', 'pdf', 'video', 'audio', 'code'].includes(category);
}

/** Gets specific user-friendly badge label for a file (e.g. "Excel", "CSV", "Word", "PowerPoint", "PDF") */
export function getFileBadgeLabel(extOrFilename: string, mimeType = ''): string {
  let extension = (extOrFilename || '').toLowerCase().trim();
  if (extension.includes('.')) {
    extension = extension.split('.').pop() || '';
  }
  extension = extension.replace(/^\./, '');

  if (['xls', 'xlsx', 'xlsm', 'xlsb', 'xlt', 'xltx'].includes(extension)) return 'Excel';
  if (['csv', 'tsv'].includes(extension)) return 'CSV';
  if (['doc', 'docx', 'docm', 'dot', 'dotx'].includes(extension)) return 'Word';
  if (['ppt', 'pptx', 'pptm', 'pps', 'ppsx'].includes(extension)) return 'PowerPoint';
  if (extension === 'pdf') return 'PDF';

  const category = getFileCategory(extOrFilename, mimeType);
  return FILE_CATEGORY_STYLES[category]?.label || 'File';
}

