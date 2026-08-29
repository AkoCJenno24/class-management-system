import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  onDocFoldersChange,
  onDocFilesChange,
  createDocFolder,
  renameDocFolder,
  moveDocFolder,
  deleteDocFolderCascade,
  createDocFileRecord,
  saveDocFileChunks,
  getDocFilePayload,
  renameDocFile,
  moveDocFile,
  deleteDocFileRecord,
} from '@/lib/firebase/firestore';
import { uploadDocumentFile, MAX_DOCUMENT_FILE_SIZE } from '@/lib/firebase/storage';
import { type DocFolder, type DocFile } from '@/types';
import {
  DocumentsHeader,
  type ViewMode,
  type SortOption,
} from '@/components/documents/DocumentsHeader';
import { FolderCard } from '@/components/documents/FolderCard';
import { FileCard } from '@/components/documents/FileCard';
import { DocumentsListView } from '@/components/documents/DocumentsListView';
import { CreateFolderDialog } from '@/components/documents/CreateFolderDialog';
import { MoveItemDialog } from '@/components/documents/MoveItemDialog';
import { FilePreviewDialog } from '@/components/documents/FilePreviewDialog';
import {
  UploadProgressWidget,
  type UploadItem,
} from '@/components/documents/UploadProgressWidget';
import { DriveContextMenu } from '@/components/documents/DriveContextMenu';
import {
  ConfirmDeleteDialog,
} from '@/components/ui/confirm-delete-dialog';
import {
  formatBytes,
} from '@/components/documents/document-utils';
import { Button } from '@/components/ui/button';
import {
  Folder,
  FolderPlus,
  FileText,
  UploadCloud,
  HardDrive,
  Loader2,
  FolderOpen,
  SearchX,
} from 'lucide-react';
import { toast } from 'sonner';

export function DocumentsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFolderId = searchParams.get('folder');

  // Firestore Data State
  const [allFolders, setAllFolders] = useState<DocFolder[]>([]);
  const [allFiles, setAllFiles] = useState<DocFile[]>([]);
  const [loading, setLoading] = useState(true);

  // UI Settings State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [searchQuery, setSearchQuery] = useState('');

  // Drag and Drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Upload state
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);

  // Dialog states
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<DocFolder | null>(null);

  const [moveDialogItem, setMoveDialogItem] = useState<{
    item: DocFolder | DocFile;
    type: 'folder' | 'file';
  } | null>(null);

  const [previewFile, setPreviewFile] = useState<DocFile | null>(null);

  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    open: boolean;
    item: DocFolder | DocFile | null;
    type: 'folder' | 'file';
    title: string;
    description: string;
  }>({
    open: false,
    item: null,
    type: 'file',
    title: '',
    description: '',
  });

  // Rename single file state
  const [fileToRename, setFileToRename] = useState<DocFile | null>(null);

  // Google Drive shortcut context menu state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let foldersLoaded = false;
    let filesLoaded = false;

    const checkDone = () => {
      if (foldersLoaded && filesLoaded) {
        setLoading(false);
      }
    };

    const unsubFolders = onDocFoldersChange(user.uid, (folders) => {
      setAllFolders(folders);
      foldersLoaded = true;
      checkDone();
    });

    const unsubFiles = onDocFilesChange(user.uid, (files) => {
      setAllFiles(files);
      filesLoaded = true;
      checkDone();
    });

    return () => {
      unsubFolders();
      unsubFiles();
    };
  }, [user]);

  // Current parent folder object
  const currentFolder = useMemo(() => {
    if (!currentFolderId) return null;
    return allFolders.find((f) => f.id === currentFolderId) || null;
  }, [allFolders, currentFolderId]);

  // Breadcrumbs calculation from path
  const breadcrumbs = useMemo(() => {
    if (!currentFolder) return [];
    const crumbs: { id: string; name: string }[] = [];

    if (currentFolder.path && currentFolder.path.length > 0) {
      for (const ancestorId of currentFolder.path) {
        const ancestor = allFolders.find((f) => f.id === ancestorId);
        if (ancestor) {
          crumbs.push({ id: ancestor.id, name: ancestor.name });
        }
      }
    }

    crumbs.push({ id: currentFolder.id, name: currentFolder.name });
    return crumbs;
  }, [currentFolder, allFolders]);

  // Navigate folder
  const handleNavigateFolder = useCallback(
    (folderId: string | null) => {
      if (folderId) {
        setSearchParams({ folder: folderId });
      } else {
        setSearchParams({});
      }
      setSearchQuery('');
    },
    [setSearchParams]
  );

  // Folder item counts (subfolders + files)
  const folderItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of allFolders) {
      counts[f.id] = 0;
    }
    for (const f of allFolders) {
      if (f.parentId && counts[f.parentId] !== undefined) {
        counts[f.parentId] += 1;
      }
    }
    for (const file of allFiles) {
      if (file.folderId && counts[file.folderId] !== undefined) {
        counts[file.folderId] += 1;
      }
    }
    return counts;
  }, [allFolders, allFiles]);

  // Total Storage footprint
  const storageStats = useMemo(() => {
    const totalBytes = allFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    return {
      totalBytes,
      formattedTotal: formatBytes(totalBytes),
      fileCount: allFiles.length,
      folderCount: allFolders.length,
    };
  }, [allFiles, allFolders]);

  // Filter items in current view
  const currentFolders = useMemo(() => {
    let list: DocFolder[] = [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = allFolders.filter((f) => f.name.toLowerCase().includes(q));
    } else {
      list = allFolders.filter((f) => f.parentId === (currentFolderId || null));
    }

    return list.sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'date-desc') return b.updatedAt.getTime() - a.updatedAt.getTime();
      if (sortBy === 'date-asc') return a.updatedAt.getTime() - b.updatedAt.getTime();
      return 0;
    });
  }, [allFolders, currentFolderId, searchQuery, sortBy]);

  const currentFiles = useMemo(() => {
    let list: DocFile[] = [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = allFiles.filter((f) => f.name.toLowerCase().includes(q));
    } else {
      list = allFiles.filter((f) => f.folderId === (currentFolderId || null));
    }

    return list.sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'date-desc') return b.createdAt.getTime() - a.createdAt.getTime();
      if (sortBy === 'date-asc') return a.createdAt.getTime() - b.createdAt.getTime();
      if (sortBy === 'size-desc') return (b.size || 0) - (a.size || 0);
      if (sortBy === 'size-asc') return (a.size || 0) - (b.size || 0);
      return 0;
    });
  }, [allFiles, currentFolderId, searchQuery, sortBy]);

  // ─── File Upload Handler ──────────────────────────────────────────────────

  const handleUploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      if (!user) return;
      const filesArray = Array.from(fileList);
      if (filesArray.length === 0) return;

      const targetFolderId = currentFolderId || null;

      // Add to upload items state
      const newItems: UploadItem[] = filesArray.map((f, idx) => ({
        id: `${Date.now()}-${idx}-${f.name}`,
        name: f.name,
        size: f.size,
        progress: 0,
        status: 'uploading',
      }));

      setUploadItems((prev) => [...prev, ...newItems]);

      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        const uploadItem = newItems[i];

        // 25MB safety check
        if (file.size > MAX_DOCUMENT_FILE_SIZE) {
          setUploadItems((prev) =>
            prev.map((item) =>
              item.id === uploadItem.id
                ? { ...item, status: 'error', error: 'File exceeds 25 MB limit' }
                : item
            )
          );
          toast.error(`"${file.name}" exceeds the 25 MB file size limit.`);
          continue;
        }

        try {
          const isLargeFile = file.size > 750 * 1024;
          const uploadRes = await uploadDocumentFile(user.uid, file, (pct) => {
            setUploadItems((prev) =>
              prev.map((item) =>
                item.id === uploadItem.id
                  ? { ...item, progress: isLargeFile ? Math.min(65, pct) : pct }
                  : item
              )
            );
          });

          const chunkCount = uploadRes.chunks ? uploadRes.chunks.length : 0;

          // Save metadata in Firestore
          const fileId = await createDocFileRecord(user.uid, {
            name: file.name,
            folderId: targetFolderId,
            storagePath: uploadRes.storagePath,
            downloadUrl: uploadRes.downloadUrl,
            size: uploadRes.size,
            mimeType: uploadRes.mimeType,
            fileExtension: uploadRes.fileExtension,
            storageType: uploadRes.storageType,
            dataUrl: uploadRes.dataUrl,
            chunkCount,
          });

          // If chunked, save chunks to Firestore subcollection
          if (uploadRes.chunks && uploadRes.chunks.length > 0) {
            await saveDocFileChunks(user.uid, fileId, uploadRes.chunks, (chunkPct) => {
              setUploadItems((prev) =>
                prev.map((item) =>
                  item.id === uploadItem.id
                    ? { ...item, progress: Math.min(99, 65 + Math.round(chunkPct * 0.34)) }
                    : item
                )
              );
            });
          }

          setUploadItems((prev) =>
            prev.map((item) =>
              item.id === uploadItem.id ? { ...item, status: 'completed', progress: 100 } : item
            )
          );
        } catch (err: unknown) {
          console.error(`Failed to upload ${file.name}:`, err);
          const errMsg = err instanceof Error ? err.message : 'Upload failed';
          setUploadItems((prev) =>
            prev.map((item) =>
              item.id === uploadItem.id
                ? { ...item, status: 'error', error: errMsg }
                : item
            )
          );
          toast.error(`Failed to upload "${file.name}": ${errMsg}`);
        }
      }

      toast.success(`Uploaded ${filesArray.length} file${filesArray.length > 1 ? 's' : ''}`);
    },
    [user, currentFolderId]
  );

  // ─── Folder Upload Handler (Full Folder Hierarchy) ─────────────────────────

  const handleUploadFolder = useCallback(
    async (fileList: FileList | File[]) => {
      if (!user) return;
      const filesArray = Array.from(fileList);
      if (filesArray.length === 0) return;

      // Extract root folder name from relative path
      const sample = filesArray[0] as File & { webkitRelativePath?: string };
      const relPath = sample.webkitRelativePath || '';
      const rootFolderName = relPath.split('/')[0] || 'Uploaded Folder';

      const parentPath = currentFolder
        ? [...(currentFolder.path || []), currentFolder.id]
        : [];

      // Create destination folder
      const rootFolderId = await createDocFolder(user.uid, {
        name: rootFolderName,
        parentId: currentFolderId || null,
        color: '#3B82F6',
        path: parentPath,
      });

      toast.info(`Created folder "${rootFolderName}". Uploading ${filesArray.length} files...`);

      const newItems: UploadItem[] = filesArray.map((f, idx) => ({
        id: `${Date.now()}-${idx}-${f.name}`,
        name: f.name,
        size: f.size,
        progress: 0,
        status: 'uploading',
      }));

      setUploadItems((prev) => [...prev, ...newItems]);

      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        const uploadItem = newItems[i];

        if (file.size > MAX_DOCUMENT_FILE_SIZE) {
          setUploadItems((prev) =>
            prev.map((item) =>
              item.id === uploadItem.id
                ? { ...item, status: 'error', error: 'Exceeds 25 MB limit' }
                : item
            )
          );
          continue;
        }

        try {
          const isLargeFile = file.size > 750 * 1024;
          const uploadRes = await uploadDocumentFile(user.uid, file, (pct) => {
            setUploadItems((prev) =>
              prev.map((item) =>
                item.id === uploadItem.id
                  ? { ...item, progress: isLargeFile ? Math.min(65, pct) : pct }
                  : item
              )
            );
          });

          const chunkCount = uploadRes.chunks ? uploadRes.chunks.length : 0;

          const fileId = await createDocFileRecord(user.uid, {
            name: file.name,
            folderId: rootFolderId,
            storagePath: uploadRes.storagePath,
            downloadUrl: uploadRes.downloadUrl,
            size: uploadRes.size,
            mimeType: uploadRes.mimeType,
            fileExtension: uploadRes.fileExtension,
            storageType: uploadRes.storageType,
            dataUrl: uploadRes.dataUrl,
            chunkCount,
          });

          if (uploadRes.chunks && uploadRes.chunks.length > 0) {
            await saveDocFileChunks(user.uid, fileId, uploadRes.chunks, (chunkPct) => {
              setUploadItems((prev) =>
                prev.map((item) =>
                  item.id === uploadItem.id
                    ? { ...item, progress: Math.min(99, 65 + Math.round(chunkPct * 0.34)) }
                    : item
                )
              );
            });
          }

          setUploadItems((prev) =>
            prev.map((item) =>
              item.id === uploadItem.id ? { ...item, status: 'completed', progress: 100 } : item
            )
          );
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Upload failed';
          setUploadItems((prev) =>
            prev.map((item) =>
              item.id === uploadItem.id ? { ...item, status: 'error', error: errMsg } : item
            )
          );
        }
      }

      toast.success(`Folder "${rootFolderName}" uploaded with ${filesArray.length} items`);
    },
    [user, currentFolderId, currentFolder]
  );

  // ─── Google Drive Keyboard Shortcuts (Alt+C then F / U / I) ────────────────

  useEffect(() => {
    let altCPressed = false;
    let timer: ReturnType<typeof setTimeout>;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'c') {
        altCPressed = true;
        clearTimeout(timer);
        timer = setTimeout(() => {
          altCPressed = false;
        }, 2000);
        return;
      }

      if (altCPressed) {
        if (e.key.toLowerCase() === 'f') {
          e.preventDefault();
          altCPressed = false;
          setFolderToEdit(null);
          setIsCreateFolderOpen(true);
        } else if (e.key.toLowerCase() === 'u') {
          e.preventDefault();
          altCPressed = false;
          fileInputRef.current?.click();
        } else if (e.key.toLowerCase() === 'i') {
          e.preventDefault();
          altCPressed = false;
          folderInputRef.current?.click();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, []);


  // ─── Drag & Drop Handlers ─────────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only reset if left the outer container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  // ─── Folder Actions ───────────────────────────────────────────────────────

  const handleCreateOrUpdateFolder = async (name: string, color: string) => {
    if (!user) return;
    if (folderToEdit) {
      await renameDocFolder(user.uid, folderToEdit.id, name);
      toast.success('Folder renamed');
      setFolderToEdit(null);
    } else {
      const parentPath = currentFolder
        ? [...(currentFolder.path || []), currentFolder.id]
        : [];
      await createDocFolder(user.uid, {
        name,
        parentId: currentFolderId || null,
        color,
        path: parentPath,
      });
      toast.success(`Created folder "${name}"`);
    }
  };

  const handlePromptDeleteFolder = (folder: DocFolder) => {
    const count = folderItemCounts[folder.id] || 0;
    setDeleteConfirmState({
      open: true,
      item: folder,
      type: 'folder',
      title: `Delete folder "${folder.name}"?`,
      description: `This will permanently delete "${folder.name}" and all of its ${count} items (nested subfolders and files) from your database and storage.`,
    });
  };

  // ─── File Actions ─────────────────────────────────────────────────────────

  const handleDownloadFile = async (file: DocFile) => {
    if (!user) return;
    const toastId = toast.loading(`Preparing download for "${file.name}"...`);

    try {
      const payloadUrl = await getDocFilePayload(user.uid, file);
      if (!payloadUrl) {
        throw new Error('File data is not available.');
      }

      // If it's a data URL, convert to a Blob to guarantee exact filename download
      if (payloadUrl.startsWith('data:')) {
        const res = await fetch(payloadUrl);
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
        toast.dismiss(toastId);
        toast.success(`Downloaded "${file.name}"`);
        return;
      }

      // If it's a remote URL (e.g. Firebase Storage):
      try {
        const response = await fetch(payloadUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
      } catch {
        // Fallback for CORS: open directly with target=_blank
        const link = document.createElement('a');
        link.href = payloadUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast.dismiss(toastId);
      toast.success(`Downloaded "${file.name}"`);
    } catch (err: unknown) {
      console.error('Download error:', err);
      toast.dismiss(toastId);
      const msg = err instanceof Error ? err.message : 'Download failed';
      toast.error(`Could not download "${file.name}": ${msg}`);
    }
  };

  const handlePreviewFile = async (file: DocFile) => {
    if (!user) return;
    try {
      if (file.dataUrl || (file.storageType === 'storage' && file.downloadUrl)) {
        setPreviewFile(file);
        return;
      }

      // If chunked in Firestore, assemble payload before opening preview dialog
      const toastId = toast.loading(`Loading "${file.name}" for preview...`);
      const fullPayload = await getDocFilePayload(user.uid, file);
      toast.dismiss(toastId);

      setPreviewFile({
        ...file,
        downloadUrl: fullPayload,
      });
    } catch (err: unknown) {
      console.error('Preview error:', err);
      toast.error('Could not load preview for this file.');
    }
  };

  const handlePromptDeleteFile = (file: DocFile) => {
    setDeleteConfirmState({
      open: true,
      item: file,
      type: 'file',
      title: `Delete file "${file.name}"?`,
      description: `Are you sure you want to permanently delete "${file.name}"? This action cannot be undone.`,
    });
  };

  const handleConfirmDelete = async () => {
    if (!user || !deleteConfirmState.item) return;

    if (deleteConfirmState.type === 'folder') {
      const folder = deleteConfirmState.item as DocFolder;
      await deleteDocFolderCascade(user.uid, folder.id, allFolders, allFiles);
      toast.success(`Folder "${folder.name}" deleted`);
      // If we were inside the deleted folder, navigate up to root or parent
      if (currentFolderId === folder.id || currentFolder?.path?.includes(folder.id)) {
        handleNavigateFolder(folder.parentId);
      }
    } else {
      const file = deleteConfirmState.item as DocFile;
      await deleteDocFileRecord(user.uid, file.id, file.storagePath);
      toast.success(`File "${file.name}" deleted`);
    }

    setDeleteConfirmState((prev) => ({ ...prev, open: false, item: null }));
  };

  const handleMoveItem = async (newParentId: string | null) => {
    if (!user || !moveDialogItem) return;

    if (moveDialogItem.type === 'folder') {
      const folder = moveDialogItem.item as DocFolder;
      const targetParent = allFolders.find((f) => f.id === newParentId);
      const newPath = targetParent ? [...(targetParent.path || []), targetParent.id] : [];
      await moveDocFolder(user.uid, folder.id, newParentId, newPath, allFolders);
      toast.success(`Moved folder to ${targetParent ? `"${targetParent.name}"` : 'Documents'}`);
    } else {
      const file = moveDialogItem.item as DocFile;
      await moveDocFile(user.uid, file.id, newParentId);
      const targetParent = allFolders.find((f) => f.id === newParentId);
      toast.success(`Moved file to ${targetParent ? `"${targetParent.name}"` : 'Documents'}`);
    }
  };

  // ─── Canvas Mouse Right-Click (Google Drive Context Menu) ──────────────────

  const handleCanvasClick = () => {
    // Left-click closes the context menu if open
    if (contextMenu.isOpen) {
      setContextMenu((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    // If right-clicking on an interactive control or item card, let its own action/menu handle it
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('[role="menu"]') ||
      target.closest('[role="dialog"]') ||
      target.closest('.group') // Folder or File card
    ) {
      return;
    }

    e.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  const isEmptyCurrentFolder = currentFolders.length === 0 && currentFiles.length === 0;

  return (
    <div
      onClick={handleCanvasClick}
      onContextMenu={handleCanvasContextMenu}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex-1 flex flex-col min-h-full cursor-default select-none"
    >
      {/* Drop Zone Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-40 bg-primary/10 backdrop-blur-xs border-2 border-dashed border-primary rounded-2xl flex flex-col items-center justify-center p-6 pointer-events-none animate-in fade-in zoom-in-95">
          <div className="size-20 rounded-3xl bg-primary/20 flex items-center justify-center text-primary mb-3 shadow-lg">
            <UploadCloud className="size-10 stroke-[2] animate-bounce" />
          </div>
          <p className="text-lg font-bold text-foreground">Drop files here to upload</p>
          <p className="text-xs text-muted-foreground mt-1">
            Uploading to {currentFolder ? `"${currentFolder.name}"` : 'My Documents'}
          </p>
        </div>
      )}

      {/* Header controls & Breadcrumbs */}
      <DocumentsHeader
        breadcrumbs={breadcrumbs}
        currentFolder={currentFolder}
        onNavigateFolder={handleNavigateFolder}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onNewFolderClick={() => {
          setFolderToEdit(null);
          setIsCreateFolderOpen(true);
        }}
        onUploadFiles={handleUploadFiles}
        onUploadFolder={handleUploadFolder}
      />

      {/* Loading state */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="size-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Loading your documents...</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-6 pt-2">
          {/* If Search returned no results */}
          {searchQuery.trim() && isEmptyCurrentFolder && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <div className="size-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                <SearchX className="size-7 stroke-[1.5]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">No matches found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No folders or files match "{searchQuery}".
                </p>
              </div>
            </div>
          )}

          {/* Empty Folder State */}
          {!searchQuery.trim() && isEmptyCurrentFolder && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4 rounded-2xl border-2 border-dashed border-border/80 bg-muted/10 p-8 my-auto">
              <div className="size-18 rounded-3xl bg-muted/60 flex items-center justify-center text-muted-foreground shadow-xs">
                <FolderOpen className="size-9 stroke-[1.5]" />
              </div>
              <div className="space-y-1 max-w-sm">
                <p className="text-base font-semibold text-foreground">This folder is empty</p>
                <p className="text-xs text-muted-foreground">
                  Drag and drop files from your computer anywhere on this page, or upload files directly.
                </p>
              </div>
              <div className="flex items-center gap-2.5 pt-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 h-9 px-4 text-xs font-medium cursor-pointer shadow-xs"
                >
                  <UploadCloud className="size-4" />
                  <span>Upload File</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFolderToEdit(null);
                    setIsCreateFolderOpen(true);
                  }}
                  className="gap-2 h-9 px-4 text-xs font-medium cursor-pointer border-border/80"
                >
                  <FolderPlus className="size-4 text-primary" />
                  <span>New Folder</span>
                </Button>
              </div>
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && !isEmptyCurrentFolder && (
            <DocumentsListView
              folders={currentFolders}
              files={currentFiles}
              folderItemCounts={folderItemCounts}
              onOpenFolder={(f) => handleNavigateFolder(f.id)}
              onRenameFolder={(f) => {
                setFolderToEdit(f);
                setIsCreateFolderOpen(true);
              }}
              onMoveFolder={(f) => setMoveDialogItem({ item: f, type: 'folder' })}
              onDeleteFolder={handlePromptDeleteFolder}
              onPreviewFile={handlePreviewFile}
              onDownloadFile={handleDownloadFile}
              onRenameFile={(file) => setFileToRename(file)}
              onMoveFile={(file) => setMoveDialogItem({ item: file, type: 'file' })}
              onDeleteFile={handlePromptDeleteFile}
            />
          )}

          {/* Grid View */}
          {viewMode === 'grid' && !isEmptyCurrentFolder && (
            <div className="space-y-6">
              {/* Folders Section */}
              {currentFolders.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Folder className="size-3.5" />
                      <span>Folders ({currentFolders.length})</span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {currentFolders.map((folder) => (
                      <FolderCard
                        key={folder.id}
                        folder={folder}
                        itemCount={folderItemCounts[folder.id] || 0}
                        onOpen={(f) => handleNavigateFolder(f.id)}
                        onRename={(f) => {
                          setFolderToEdit(f);
                          setIsCreateFolderOpen(true);
                        }}
                        onMove={(f) => setMoveDialogItem({ item: f, type: 'folder' })}
                        onDelete={handlePromptDeleteFolder}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Files Section */}
              {currentFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText className="size-3.5" />
                      <span>Files ({currentFiles.length})</span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {currentFiles.map((file) => (
                      <FileCard
                        key={file.id}
                        file={file}
                        onPreview={handlePreviewFile}
                        onDownload={handleDownloadFile}
                        onRename={(f) => setFileToRename(f)}
                        onMove={(f) => setMoveDialogItem({ item: f, type: 'file' })}
                        onDelete={handlePromptDeleteFile}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer stats bar */}
          <div className="pt-6 mt-auto border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <HardDrive className="size-3.5 text-muted-foreground" />
              <span>
                {storageStats.fileCount} {storageStats.fileCount === 1 ? 'file' : 'files'} in {storageStats.folderCount} {storageStats.folderCount === 1 ? 'folder' : 'folders'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{storageStats.formattedTotal}</span>
              <span>total storage used</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Upload Progress Widget */}
      <UploadProgressWidget
        items={uploadItems}
        onDismiss={() => setUploadItems([])}
      />

      {/* Create / Edit Folder Dialog */}
      <CreateFolderDialog
        open={isCreateFolderOpen}
        onOpenChange={setIsCreateFolderOpen}
        folderToEdit={folderToEdit}
        currentParentFolder={currentFolder}
        onSubmit={handleCreateOrUpdateFolder}
      />

      {/* Move Item Dialog */}
      <MoveItemDialog
        open={!!moveDialogItem}
        onOpenChange={(open) => {
          if (!open) setMoveDialogItem(null);
        }}
        item={moveDialogItem?.item ?? null}
        itemType={moveDialogItem?.type ?? 'file'}
        allFolders={allFolders}
        onMove={handleMoveItem}
      />

      {/* File Preview Dialog */}
      <FilePreviewDialog
        open={!!previewFile}
        onOpenChange={(open) => {
          if (!open) setPreviewFile(null);
        }}
        file={previewFile}
        onDownload={handleDownloadFile}
      />

      {/* Rename File Modal */}
      {fileToRename && (
        <CreateFolderDialog
          open={!!fileToRename}
          onOpenChange={(open) => {
            if (!open) setFileToRename(null);
          }}
          folderToEdit={{
            id: fileToRename.id,
            userId: fileToRename.userId,
            name: fileToRename.name,
            parentId: null,
            path: [],
            createdAt: fileToRename.createdAt,
            updatedAt: fileToRename.updatedAt,
          }}
          onSubmit={async (newName) => {
            if (!user) return;
            await renameDocFile(user.uid, fileToRename.id, newName);
            toast.success('File renamed');
            setFileToRename(null);
          }}
        />
      )}

      {/* Cascading Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={deleteConfirmState.open}
        onOpenChange={(open) =>
          setDeleteConfirmState((prev) => ({ ...prev, open }))
        }
        title={deleteConfirmState.title}
        description={deleteConfirmState.description}
        onConfirm={handleConfirmDelete}
      />

      {/* Hidden File Input for Context Menu */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUploadFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Hidden Folder Input for Context Menu */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory standard
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUploadFolder(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Google Drive Shortcut Options Context Menu (Left-Click & Right-Click) */}
      <DriveContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
        onNewFolder={() => {
          setFolderToEdit(null);
          setIsCreateFolderOpen(true);
        }}
        onUploadFile={() => fileInputRef.current?.click()}
        onUploadFolder={() => folderInputRef.current?.click()}
      />
    </div>
  );
}
