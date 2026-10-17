import React, { useState, useEffect } from 'react';
import { devApi } from '../lib/api';
import { toast } from 'sonner';
import { useDialog } from '../hooks/use-dialog';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { FolderDown, Plus, Copy, ExternalLink, Activity, X, Lock, RefreshCw, ShieldCheck, Info, Upload, HardDrive, Sparkles, Crown, FileCheck, AlertCircle } from 'lucide-react';
import { createPortal } from 'react-dom';

interface FilesProps {
  appId: string;
  appName: string;
  isPaused?: boolean;
}

export default function FilesView({ appId, appName, isPaused = false }: FilesProps) {
  const { confirm } = useDialog();
  const [filesList, setFilesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [fileMode, setFileMode] = useState<'url' | 'upload'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [userPlan, setUserPlan] = useState<string>('Free');
  const [userRole, setUserRole] = useState<string>('');
  
  const [formData, setFormData] = useState({
    name: '',
    download_url: '',
    version_tag: '',
    is_latest_release: false,
    is_authenticated: false,
    tags: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiHost = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '') : '') || 'https://dexterauth.onrender.com';
  
  const cleanAppName = encodeURIComponent(appName || appId);
  const staticLatestDownloadUrl = `${apiHost}/api/v1/client/download/latest/${cleanAppName}`;

  const uploadedFilesList = filesList.filter(f => f.is_uploaded);
  const uploadedFilesCount = uploadedFilesList.length;
  const totalUploadedBytes = uploadedFilesList.reduce((sum, f) => sum + Number(f.file_size || 0), 0);

  const totalUploadedMB = (totalUploadedBytes / (1024 * 1024)).toFixed(2);
  const isSellerOrMaster = userPlan === 'Seller' || userRole === 'master_admin';

  const fetchUserData = async () => {
    try {
      const res = await devApi.getMe();
      if (res.status === 'success' && res.data?.user) {
        setUserPlan(res.data.user.plan || 'Free');
        setUserRole(res.data.user.role || '');
      }
    } catch (e) {
      console.error("Failed to fetch user profile", e);
    }
  };

  const fetchFiles = async () => {
    if (!appId) return;
    setLoading(true);
    try {
      const res = await devApi.getFiles(appId);
      if (res.status === 'success') {
        setFilesList(res.data.files || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch files", err);
      toast.error(err.response?.data?.message || "Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    fetchFiles();
  }, [appId]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFileMode('url');
    setSelectedFile(null);
    setUploadProgress(null);
    setFormData({
      name: '',
      download_url: '',
      version_tag: '',
      is_latest_release: false,
      is_authenticated: false,
      tags: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (file: any) => {
    setEditingItem(file);
    setFileMode('url');
    setSelectedFile(null);
    setUploadProgress(null);
    setFormData({
      name: file.name || '',
      download_url: file.download_url || '',
      version_tag: file.version_tag || '',
      is_latest_release: Boolean(file.is_latest_release),
      is_authenticated: Boolean(file.is_authenticated),
      tags: Array.isArray(file.tags) ? file.tags.join(', ') : (file.tags || '')
    });
    setShowModal(true);
  };

  const handleSaveFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appId) return;

    if (editingItem) {
      // Editing existing record
      if (!formData.name.trim() || !formData.download_url.trim()) {
        toast.error("File name and direct download link URL are required.");
        return;
      }
      setIsSubmitting(true);
      try {
        const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
        await devApi.updateFile(appId, editingItem.id, {
          name: formData.name.trim(),
          download_url: formData.download_url.trim(),
          version_tag: formData.version_tag.trim() || undefined,
          is_latest_release: formData.is_latest_release,
          is_authenticated: formData.is_authenticated,
          tags: tagsArray
        });
        toast.success("File updated successfully!");
        setShowModal(false);
        fetchFiles();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to update file");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Creating new record
    if (fileMode === 'upload') {
      if (!selectedFile) {
        toast.error("Please select a binary file to upload.");
        return;
      }
      if (!isSellerOrMaster) {
        toast.error("Direct binary file upload is exclusively available for Seller plan accounts.");
        return;
      }
      
      if (uploadedFilesCount >= 5) {
        toast.error("Application file count limit reached! Each application is capped at 5 uploaded binary files maximum.");
        return;
      }

      const MAX_STORAGE = 30 * 1024 * 1024;
      if (totalUploadedBytes + selectedFile.size > MAX_STORAGE) {
        toast.error(`30 MB application storage limit exceeded! Currently used: ${totalUploadedMB} MB, Upload size: ${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB.`);
        return;
      }

      setIsSubmitting(true);
      setUploadProgress(0);
      try {
        const formPayload = new FormData();
        formPayload.append('file', selectedFile);
        if (formData.name.trim()) formPayload.append('name', formData.name.trim());
        if (formData.version_tag.trim()) formPayload.append('version_tag', formData.version_tag.trim());
        formPayload.append('is_latest_release', String(formData.is_latest_release));
        formPayload.append('is_authenticated', String(formData.is_authenticated));
        if (formData.tags.trim()) formPayload.append('tags', formData.tags.trim());

        await devApi.uploadFile(appId, formPayload, (percent) => {
          setUploadProgress(percent);
        });
        toast.success("Binary file uploaded successfully!");
        setShowModal(false);
        fetchFiles();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to upload binary file");
      } finally {
        setIsSubmitting(false);
        setUploadProgress(null);
      }
    } else {
      // Direct Download Link URL Mode
      if (!formData.name.trim() || !formData.download_url.trim()) {
        toast.error("File name and direct download link URL are required.");
        return;
      }
      setIsSubmitting(true);
      try {
        const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
        await devApi.createFile(appId, {
          name: formData.name.trim(),
          download_url: formData.download_url.trim(),
          version_tag: formData.version_tag.trim() || undefined,
          is_latest_release: formData.is_latest_release,
          is_authenticated: formData.is_authenticated,
          tags: tagsArray
        });
        toast.success("File created successfully!");
        setShowModal(false);
        fetchFiles();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to save file");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleToggleLatestRelease = async (file: any) => {
    if (!appId) return;
    try {
      await devApi.setLatestReleaseFile(appId, file.id);
      toast.success(`'${file.name}' set as the latest release!`);
      fetchFiles();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to set latest release");
    }
  };

  const handleDeleteFile = async (file: any) => {
    if (!appId) return;
    if (!await confirm({
      title: "Delete File Entry",
      description: `Are you sure you want to delete '${file.name}'? SDK download requests for this file will fail.`,
      variant: "destructive"
    })) return;

    try {
      await devApi.deleteFile(appId, file.id);
      toast.success("File entry deleted successfully!");
      fetchFiles();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete file");
    }
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-1 flex items-center gap-3">
            <FolderDown className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
            Files & Auto-Update
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Manage downloadable binary releases, installers, and static auto-update URLs for <span className="font-semibold text-foreground">{appName}</span>.
          </p>
        </div>
        <Button 
          onClick={handleOpenCreate} 
          disabled={isPaused}
          className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all h-[42px] flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add File
        </Button>
      </div>

      {/* Permanent Static Auto-Update Box */}
      <Card className="bg-primary/5 border-primary/20 bg-card border rounded-2xl shadow-xl overflow-hidden">
        <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-3">
          <CardTitle className="flex items-center text-sm sm:text-base font-bold text-primary">
            <RefreshCw className="w-4 h-4 mr-2 shrink-0" /> Permanent Static Auto-Update Endpoint (Never Changes)
          </CardTitle>
          <CardDescription className="text-xs">
            Configure this permanent URL in your C#, C++, or Python SDK auto-updater. When you release a new version and flag it as <strong>Latest Release</strong>, Dexter Auth backend automatically streams/downloads the newest file.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="flex items-center gap-2 text-xs font-mono text-foreground bg-muted/80 p-3 rounded-lg border border-primary/30 overflow-x-auto">
            <span className="truncate flex-1 select-all">{staticLatestDownloadUrl}</span>
            <button 
              onClick={() => copyToClipboard(staticLatestDownloadUrl, "Auto-Update Endpoint")} 
              className="p-1.5 hover:bg-primary/20 rounded text-primary transition-colors flex-shrink-0"
              title="Copy Permanent Auto-Update URL"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Storage Usage Banner for Uploaded Files */}
      <Card className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden transition-all duration-300 hover:border-primary/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-0 pointer-events-none" />
        
        <div className="relative z-10 space-y-5">
          {/* Top Header Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/50">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/25 text-primary shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight whitespace-nowrap">
                    Application Storage Quota
                  </h3>
                  {isSellerOrMaster ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-1.5 shadow-sm whitespace-nowrap">
                      <Crown className="w-3.5 h-3.5 text-amber-500" /> Seller Plan Active
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/25 flex items-center gap-1.5 whitespace-nowrap">
                      <Lock className="w-3.5 h-3.5" /> Seller Plan Only
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Direct binary hosting for application builds, updates, and installers.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted text-xs font-semibold text-foreground border border-border/60">
                ⚡ 30 MB Storage Limit
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted text-xs font-semibold text-foreground border border-border/60">
                📦 5 Files Max
              </span>
            </div>
          </div>

          {/* Bottom Meters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File Slots Indicator */}
            <div className="bg-muted/40 p-4 rounded-xl border border-border/60 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">File Slots Allocation</span>
                <span className="font-bold text-foreground font-mono text-xs">{uploadedFilesCount} / 5 Slots Used</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                {[0, 1, 2, 3, 4].map((idx) => (
                  <div 
                    key={idx} 
                    className={`h-2.5 flex-1 rounded-full transition-all duration-300 ${
                      idx < uploadedFilesCount 
                        ? 'bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]' 
                        : 'bg-muted border border-border/60'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Storage Size Meter */}
            <div className="bg-muted/40 p-4 rounded-xl border border-border/60 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">Total Storage Capacity</span>
                <span className={`font-mono font-bold text-xs ${totalUploadedBytes > 28 * 1024 * 1024 ? 'text-rose-500' : 'text-primary'}`}>
                  {totalUploadedMB} MB / 30.00 MB
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden border border-border/60">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    totalUploadedBytes > 25 * 1024 * 1024 ? 'bg-rose-500' : 'bg-primary'
                  }`} 
                  style={{ width: `${Math.min(100, (totalUploadedBytes / (30 * 1024 * 1024)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center text-base sm:text-lg">
            <FolderDown className="w-5 h-5 mr-2 text-primary shrink-0"/> Release Files List
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Files can be downloaded directly or via backend proxy. Authenticated files block unauthenticated direct browser downloads with HTTP 401.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Activity className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filesList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-xl p-6 bg-muted/20">
              <FolderDown className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-1">No files found</h3>
              <p className="text-xs text-muted-foreground max-w-md mb-5">
                Add direct download links or upload build binaries to enable SDK auto-updating.
              </p>
              <Button onClick={handleOpenCreate} disabled={isPaused} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" /> Create First File
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filesList.map((file) => {
                const proxyDownloadUrl = `${apiHost}/api/v1/client/download/tag/${cleanAppName}/${encodeURIComponent(file.version_tag || file.id)}`;
                
                return (
                  <div 
                    key={file.id} 
                    className={`p-4 sm:p-5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      file.is_latest_release 
                      ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm' 
                      : 'bg-card hover:border-primary/40 border-border/60 shadow-sm'
                    }`}
                  >
                    <div className="space-y-2.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <h4 className="font-bold text-sm sm:text-base text-foreground truncate break-all">
                          {file.name}
                        </h4>
                        {file.is_uploaded && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/40 flex items-center gap-1">
                            <Upload className="w-3 h-3 text-purple-400" /> Direct Binary ({(file.file_size / (1024 * 1024)).toFixed(2)} MB)
                          </span>
                        )}
                        {file.version_tag && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                            {file.version_tag}
                          </span>
                        )}
                        {file.is_latest_release && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                            ⭐ Latest Release
                          </span>
                        )}
                        {file.is_authenticated ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Protected
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Public
                          </span>
                        )}
                      </div>

                      {/* Backend Proxy Endpoint */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Backend Proxy Endpoint ({file.is_authenticated ? 'Auth Token Required' : 'Public Download'})
                        </label>
                        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted/60 p-2 rounded-lg border border-border/50 max-w-full overflow-hidden">
                          <span className="truncate flex-1">{proxyDownloadUrl}</span>
                          <button 
                            onClick={() => copyToClipboard(proxyDownloadUrl, "Backend Proxy Download Link")} 
                            className="p-1 hover:text-foreground transition-colors flex-shrink-0"
                            title="Copy Proxy Download Link"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Storage Source URL */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Source URL
                        </label>
                        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground/80 bg-muted/30 p-2 rounded-lg border border-border/40 max-w-full overflow-hidden">
                          <span className="truncate flex-1">{file.download_url}</span>
                          <button 
                            onClick={() => copyToClipboard(file.download_url, "Source URL")} 
                            className="p-1 hover:text-foreground transition-colors flex-shrink-0"
                            title="Copy Source URL"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <a 
                            href={file.download_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="p-1 hover:text-foreground transition-colors flex-shrink-0"
                            title="Open Source URL"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      {Array.isArray(file.tags) && file.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {file.tags.map((tag: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 text-[11px] rounded bg-muted text-muted-foreground font-mono">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap flex-shrink-0 self-end md:self-auto">
                      {!file.is_latest_release && (
                        <Button 
                          onClick={() => handleToggleLatestRelease(file)} 
                          disabled={isPaused}
                          variant="outline" 
                          size="sm"
                          className="text-xs h-8 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                        >
                          Make Latest
                        </Button>
                      )}
                      <Button 
                        onClick={() => handleOpenEdit(file)} 
                        disabled={isPaused}
                        variant="outline" 
                        size="sm"
                        className="text-xs h-8"
                      >
                        Edit
                      </Button>
                      <Button 
                        onClick={() => handleDeleteFile(file)} 
                        disabled={isPaused}
                        variant="destructive" 
                        size="sm"
                        className="text-xs h-8"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit File Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3 sm:pb-4">
              <h3 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                <FolderDown className="w-5 h-5 text-primary shrink-0" />
                {editingItem ? 'Edit File' : 'Add New File'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFile} className="space-y-4">
              {!editingItem && (
                <div className="grid grid-cols-2 gap-2 bg-muted/60 p-1 rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setFileMode('url')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                      fileMode === 'url'
                        ? 'bg-card text-foreground shadow-sm border border-border'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> External URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setFileMode('upload')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                      fileMode === 'upload'
                        ? 'bg-primary text-primary-foreground shadow-sm font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Binary (Seller Plan)
                  </button>
                </div>
              )}

              {fileMode === 'upload' && !editingItem ? (
                <div className="space-y-3">
                  {!isSellerOrMaster ? (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-sm">
                          <Crown className="w-4 h-4 text-amber-500" /> Seller Plan Exclusive Feature
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 uppercase tracking-wider">
                          Locked
                        </span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        Direct binary file hosting is reserved for <strong>Seller plan</strong> subscribers. Upgrade your account plan to upload <code>.exe</code>, <code>.zip</code>, and build binaries directly (30 MB & 5 files max per application).
                      </p>
                      <a 
                        href="/checkout?plan=Seller" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-colors shadow-sm"
                      >
                        <Crown className="w-3.5 h-3.5" /> Upgrade to Seller Plan
                      </a>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Select Binary File to Upload * (Max 30 MB Total Quota, 5 Files Limit)
                      </label>
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setSelectedFile(file);
                          if (file && !formData.name) {
                            setFormData(prev => ({ ...prev, name: file.name }));
                          }
                        }}
                        disabled={isSubmitting || uploadedFilesCount >= 5}
                        required
                        className="block w-full text-xs text-muted-foreground file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 bg-muted/40 border border-border rounded-xl cursor-pointer disabled:opacity-50"
                      />
                      {uploadedFilesCount >= 5 && (
                        <p className="text-xs text-rose-500 mt-1 font-semibold">
                          ⚠️ Maximum limit of 5 uploaded files reached for this application. Delete an existing uploaded file to upload a new one.
                        </p>
                      )}
                      {selectedFile && (
                        <div className="mt-2 text-xs font-mono text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50 flex items-center justify-between">
                          <span className="truncate flex-1 font-semibold text-foreground mr-2">{selectedFile.name}</span>
                          <span className="shrink-0 font-bold text-primary">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                      )}
                      <div className="mt-2 flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/20 border border-border/40 rounded-lg p-2.5">
                        <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                        <div>
                          <strong>Secure & Protected:</strong> Uploaded binaries are stored on Dexter Auth secure storage, scanned for dangerous web script extensions, and served with <code>nosniff</code> binary content protection.
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Display File Name (Optional)
                    </label>
                    <Input 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. MyGame_Setup_v2.1.exe"
                      disabled={isSubmitting}
                      className="bg-muted/50 border-border"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      File Name *
                    </label>
                    <Input 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. MyGame_Setup_v2.1.exe, app.zip, build.apk"
                      required
                      disabled={isSubmitting}
                      className="bg-muted/50 border-border"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Direct Download Link URL / Storage URL *
                    </label>
                    <Input 
                      value={formData.download_url}
                      onChange={(e) => setFormData({ ...formData, download_url: e.target.value })}
                      placeholder="https://cdn.example.com/downloads/setup.exe"
                      required
                      disabled={isSubmitting}
                      className="bg-muted/50 border-border font-mono text-sm"
                    />
                    <div className="mt-2 flex items-start gap-2 text-[11px] text-amber-500 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-lg p-2.5">
                      <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                      <div>
                        <strong className="font-semibold">Tip for Auto-Updater:</strong> Enter a <u>direct download link</u> to the raw binary file (e.g., <code>.exe</code>, <code>.zip</code>, <code>.bin</code>). Do not use HTML web pages or file viewer URLs, as SDK auto-updaters will reject non-direct links.
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Version Tag
                  </label>
                  <Input 
                    value={formData.version_tag}
                    onChange={(e) => setFormData({ ...formData, version_tag: e.target.value })}
                    placeholder="e.g. v2.1.0"
                    disabled={isSubmitting}
                    className="bg-muted/50 border-border font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Tags (comma separated)
                  </label>
                  <Input 
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="win64, stable, latest"
                    disabled={isSubmitting}
                    className="bg-muted/50 border-border font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2 bg-muted/30 p-3.5 sm:p-4 rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <Switch 
                    id="is_latest_release"
                    checked={formData.is_latest_release}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_latest_release: checked })}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="is_latest_release" className="text-sm font-semibold text-foreground cursor-pointer">
                    Set as Latest Release (Auto-Update Target)
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground pl-11">
                  Flagging this file as Latest Release demotes any previous latest release file for this application.
                </p>

                <div className="flex items-center gap-3 pt-2">
                  <Switch 
                    id="is_authenticated"
                    checked={formData.is_authenticated}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_authenticated: checked })}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="is_authenticated" className="text-sm font-semibold text-foreground cursor-pointer">
                    Require User Authentication (Session Token)
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground pl-11">
                  When enabled, downloads via Dexter Auth backend endpoints require a valid user session token (`session_token`). Direct unauthenticated requests return 401 Unauthorized.
                </p>
              </div>

              {/* Upload Progress Bar Indicator */}
              {isSubmitting && uploadProgress !== null && (
                <div className="space-y-2 p-3.5 rounded-xl bg-primary/10 border border-primary/30 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center text-xs font-bold text-primary">
                    <span className="flex items-center gap-2">
                      <Activity className="w-4 h-4 animate-spin text-primary" /> Uploading Binary File...
                    </span>
                    <span className="font-mono text-sm">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden border border-border">
                    <div 
                      className="h-full bg-primary transition-all duration-150 rounded-full" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 sm:pt-4 border-t border-border">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || (fileMode === 'upload' && !editingItem && (!isSellerOrMaster || uploadedFilesCount >= 5))} 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
                >
                  {isSubmitting && uploadProgress !== null
                    ? `Uploading (${uploadProgress}%)...`
                    : isSubmitting
                    ? 'Saving...'
                    : editingItem
                    ? 'Save Changes'
                    : fileMode === 'upload'
                    ? 'Upload Binary File'
                    : 'Create File'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
