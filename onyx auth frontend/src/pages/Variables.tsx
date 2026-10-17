import React, { useState, useEffect } from 'react';
import { devApi } from '../lib/api';
import { toast } from 'sonner';
import { useDialog } from '../hooks/use-dialog';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { Blocks, Plus, Copy, Activity, X, User, Globe, Lock } from 'lucide-react';
import { createPortal } from 'react-dom';
import { SelectAnimated } from '../components/ui/select-animated';

interface VariablesProps {
  appId: string;
  appName: string;
  isPaused?: boolean;
}

export default function VariablesView({ appId, appName, isPaused = false }: VariablesProps) {
  const { confirm } = useDialog();
  const [varTab, setVarTab] = useState<'global' | 'user'>('global');
  const [globalVars, setGlobalVars] = useState<any[]>([]);
  const [userVars, setUserVars] = useState<any[]>([]);
  const [appUsersList, setAppUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showGlobalModal, setShowGlobalModal] = useState(false);
  const [editingGlobalItem, setEditingGlobalItem] = useState<any | null>(null);
  const [globalForm, setGlobalForm] = useState({ name: '', data: '', is_authenticated: false });

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserItem, setEditingUserItem] = useState<any | null>(null);
  const [userForm, setUserForm] = useState({ user_id: 'all', name: '', data: '', is_readonly: false });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    if (!appId) return;
    setLoading(true);
    try {
      if (varTab === 'global') {
        const res = await devApi.getGlobalVariables(appId);
        if (res.status === 'success') {
          setGlobalVars(res.data.variables || []);
        }
      } else {
        const [uVarRes, usersRes] = await Promise.all([
          devApi.getUserVariables(appId),
          devApi.getUsers(appId)
        ]);
        if (uVarRes.status === 'success') {
          setUserVars(uVarRes.data.variables || []);
        }
        if (usersRes.status === 'success') {
          setAppUsersList(usersRes.data.users || []);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch variables", err);
      toast.error(err.response?.data?.message || "Failed to load variables");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [appId, varTab]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
  };

  // --- Global Variable Handlers ---
  const handleOpenCreateGlobal = () => {
    setEditingGlobalItem(null);
    setGlobalForm({ name: '', data: '', is_authenticated: false });
    setShowGlobalModal(true);
  };

  const handleOpenEditGlobal = (v: any) => {
    setEditingGlobalItem(v);
    setGlobalForm({ name: v.name || '', data: v.data || '', is_authenticated: Boolean(v.is_authenticated) });
    setShowGlobalModal(true);
  };

  const handleSaveGlobal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appId) return;
    if (!globalForm.name.trim()) {
      toast.error("Variable name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingGlobalItem) {
        await devApi.updateGlobalVariable(appId, editingGlobalItem.id, {
          name: globalForm.name.trim(),
          data: globalForm.data,
          is_authenticated: globalForm.is_authenticated
        });
        toast.success("Global variable updated successfully!");
      } else {
        await devApi.createGlobalVariable(appId, {
          name: globalForm.name.trim(),
          data: globalForm.data,
          is_authenticated: globalForm.is_authenticated
        });
        toast.success("Global variable created successfully!");
      }
      setShowGlobalModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save global variable");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGlobal = async (v: any) => {
    if (!appId) return;
    if (!await confirm({
      title: "Delete Global Variable",
      description: `Are you sure you want to delete global variable '${v.name}'?`,
      variant: "destructive"
    })) return;

    try {
      await devApi.deleteGlobalVariable(appId, v.id);
      toast.success("Global variable deleted successfully!");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete global variable");
    }
  };

  // --- User Variable Handlers ---
  const handleOpenCreateUser = () => {
    setEditingUserItem(null);
    setUserForm({ user_id: 'all', name: '', data: '', is_readonly: false });
    setShowUserModal(true);
  };

  const handleOpenEditUser = (v: any) => {
    setEditingUserItem(v);
    setUserForm({
      user_id: v.user_id || 'all',
      name: v.name || '',
      data: v.data || '',
      is_readonly: Boolean(v.is_readonly)
    });
    setShowUserModal(true);
  };

  const handleSaveUserVar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appId) return;
    if (!userForm.name.trim()) {
      toast.error("Variable name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUserItem) {
        await devApi.updateUserVariable(appId, editingUserItem.id, {
          name: userForm.name.trim(),
          data: userForm.data,
          is_readonly: userForm.is_readonly
        });
        toast.success("User variable updated successfully!");
      } else {
        await devApi.createUserVariable(appId, {
          user_id: userForm.user_id === 'all' ? null : userForm.user_id,
          name: userForm.name.trim(),
          data: userForm.data,
          is_readonly: userForm.is_readonly
        });
        toast.success("User variable created successfully!");
      }
      setShowUserModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save user variable");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUserVar = async (v: any) => {
    if (!appId) return;
    if (!await confirm({
      title: "Delete User Variable",
      description: `Are you sure you want to delete user variable '${v.name}'?`,
      variant: "destructive"
    })) return;

    try {
      await devApi.deleteUserVariable(appId, v.id);
      toast.success("User variable deleted successfully!");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete user variable");
    }
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-1 flex items-center gap-3">
            <Blocks className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
            Variables Management
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Store arbitrary string payload data for <span className="font-semibold text-foreground">{appName}</span>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Tab Switcher */}
          <div className="inline-flex items-center p-1 bg-card rounded-xl border border-border shadow-sm">
            <button
              onClick={() => setVarTab('global')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs transition-all duration-200 flex items-center justify-center gap-2 ${
                varTab === 'global'
                  ? 'bg-primary text-primary-foreground shadow-md font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium'
              }`}
            >
              <Globe className="w-4 h-4" /> Global Variables
            </button>
            <button
              onClick={() => setVarTab('user')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs transition-all duration-200 flex items-center justify-center gap-2 ${
                varTab === 'user'
                  ? 'bg-primary text-primary-foreground shadow-md font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium'
              }`}
            >
              <User className="w-4 h-4" /> User Variables
            </button>
          </div>

          <Button 
            onClick={varTab === 'global' ? handleOpenCreateGlobal : handleOpenCreateUser} 
            disabled={isPaused}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all h-[38px] flex items-center justify-center gap-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            {varTab === 'global' ? 'Create Global Var' : 'Create User Var'}
          </Button>
        </div>
      </div>

      {varTab === 'global' ? (
        <Card className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center text-base sm:text-lg">
              <Globe className="w-5 h-5 mr-2 text-primary shrink-0"/> Global Variables
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Accessible to SDK requests. Names are case-insensitive unique.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Activity className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : globalVars.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-xl p-6 bg-muted/20">
                <Blocks className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <h3 className="text-base font-semibold text-foreground mb-1">No global variables found</h3>
                <p className="text-xs text-muted-foreground max-w-md mb-5">
                  Create your first global variable to supply configurations or data payloads to your app.
                </p>
                <Button onClick={handleOpenCreateGlobal} disabled={isPaused} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" /> Create Global Variable
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {globalVars.map((v) => (
                  <div key={v.id} className="p-4 sm:p-5 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-all shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground break-all">{v.name}</span>
                        {v.is_authenticated ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Auth Session Required
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            Public SDK Access
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button onClick={() => copyToClipboard(v.data, "Variable Data")} variant="outline" size="sm" className="text-xs h-8 px-2.5">
                          <Copy className="w-3 h-3 mr-1" /> Copy
                        </Button>
                        <Button onClick={() => handleOpenEditGlobal(v)} disabled={isPaused} variant="outline" size="sm" className="text-xs h-8 px-2.5">
                          Edit
                        </Button>
                        <Button onClick={() => handleDeleteGlobal(v)} disabled={isPaused} variant="destructive" size="sm" className="text-xs h-8 px-2.5">
                          Delete
                        </Button>
                      </div>
                    </div>
                    <pre className="bg-muted/40 text-foreground p-3 rounded-lg text-xs overflow-x-auto max-h-40 whitespace-pre-wrap break-all border border-border/50 font-sans">
                      {v.data || '<empty string>'}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center text-base sm:text-lg">
              <User className="w-5 h-5 mr-2 text-primary shrink-0"/> User Variables
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Per-user key-value data storage. Can target "All Users" or specific app users.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Activity className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : userVars.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-xl p-6 bg-muted/20">
                <User className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <h3 className="text-base font-semibold text-foreground mb-1">No user variables found</h3>
                <p className="text-xs text-muted-foreground max-w-md mb-5">
                  Create user variables to store user-specific settings, hardware profiles, or saved states.
                </p>
                <Button onClick={handleOpenCreateUser} disabled={isPaused} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" /> Create User Variable
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {userVars.map((v) => (
                  <div key={v.id} className="p-4 sm:p-5 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-all shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground break-all">{v.name}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                          Target: {v.username || 'All Users'}
                        </span>
                        {v.is_readonly && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/30">
                            🔒 Readonly
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button onClick={() => copyToClipboard(v.data, "Variable Data")} variant="outline" size="sm" className="text-xs h-8 px-2.5">
                          <Copy className="w-3 h-3 mr-1" /> Copy
                        </Button>
                        <Button onClick={() => handleOpenEditUser(v)} disabled={isPaused} variant="outline" size="sm" className="text-xs h-8 px-2.5">
                          Edit
                        </Button>
                        <Button onClick={() => handleDeleteUserVar(v)} disabled={isPaused} variant="destructive" size="sm" className="text-xs h-8 px-2.5">
                          Delete
                        </Button>
                      </div>
                    </div>
                    <pre className="bg-muted/40 text-foreground p-3 rounded-lg text-xs overflow-x-auto max-h-40 whitespace-pre-wrap break-all border border-border/50 font-sans">
                      {v.data || '<empty string>'}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Global Variable Modal */}
      {showGlobalModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3 sm:pb-4">
              <h3 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary shrink-0" />
                {editingGlobalItem ? 'Edit Global Variable' : 'Create Global Variable'}
              </h3>
              <button onClick={() => setShowGlobalModal(false)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGlobal} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Variable Name *
                </label>
                <Input 
                  value={globalForm.name}
                  onChange={(e) => setGlobalForm({ ...globalForm, name: e.target.value })}
                  placeholder="e.g. SERVER_MOTD"
                  required
                  className="bg-muted/50 border-border text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Variable Data
                </label>
                <Textarea 
                  value={globalForm.data}
                  onChange={(e) => setGlobalForm({ ...globalForm, data: e.target.value })}
                  placeholder="Enter multi-line text, JSON, configuration, or raw payload..."
                  rows={5}
                  className="bg-muted/50 border-border text-sm"
                />
              </div>

              <div className="flex items-center gap-3 pt-2 bg-muted/30 p-3.5 sm:p-4 rounded-xl border border-border">
                <Switch 
                  id="is_authenticated"
                  checked={globalForm.is_authenticated}
                  onCheckedChange={(checked) => setGlobalForm({ ...globalForm, is_authenticated: checked })}
                />
                <div>
                  <Label htmlFor="is_authenticated" className="text-sm font-semibold text-foreground cursor-pointer">
                    Require Authenticated User Session
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    SDK requests must supply a valid user session token to read this variable.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 sm:pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowGlobalModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6">
                  {isSubmitting ? 'Saving...' : editingGlobalItem ? 'Save Changes' : 'Create Variable'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* User Variable Modal */}
      {showUserModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3 sm:pb-4">
              <h3 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                <User className="w-5 h-5 text-primary shrink-0" />
                {editingUserItem ? 'Edit User Variable' : 'Create User Variable'}
              </h3>
              <button onClick={() => setShowUserModal(false)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserVar} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Select User *
                </label>
                {editingUserItem ? (
                  <div className="w-full h-10 px-3 flex items-center bg-muted/60 border border-border rounded-lg text-sm text-foreground">
                    {appUsersList.find(u => u.id === userForm.user_id)?.username || (userForm.user_id === 'all' ? 'All Users (Default Fallback)' : userForm.user_id)}
                  </div>
                ) : (
                  <SelectAnimated
                    options={[
                      { value: 'all', label: 'All Users (Default Fallback)' },
                      ...appUsersList.map(u => ({
                        value: u.id,
                        label: `${u.username}${u.email ? ` (${u.email})` : ''}`
                      }))
                    ]}
                    value={userForm.user_id}
                    onChange={(val) => setUserForm({ ...userForm, user_id: val })}
                    placeholder="Select Target User..."
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Variable Name *
                </label>
                <Input 
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="e.g. HWID_HASH"
                  required
                  className="bg-muted/50 border-border text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Variable Data
                </label>
                <Textarea 
                  value={userForm.data}
                  onChange={(e) => setUserForm({ ...userForm, data: e.target.value })}
                  placeholder="Enter multi-line text or value..."
                  rows={5}
                  className="bg-muted/50 border-border text-sm"
                />
              </div>

              <div className="flex items-center gap-3 pt-2 bg-muted/30 p-3.5 sm:p-4 rounded-xl border border-border">
                <Switch 
                  id="is_readonly"
                  checked={userForm.is_readonly}
                  onCheckedChange={(checked) => setUserForm({ ...userForm, is_readonly: checked })}
                />
                <div>
                  <Label htmlFor="is_readonly" className="text-sm font-semibold text-foreground cursor-pointer">
                    Readonly (Client SDK Cannot Modify)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, client SDK requests to write or mutate this variable will return 403 Forbidden.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 sm:pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowUserModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6">
                  {isSubmitting ? 'Saving...' : editingUserItem ? 'Save Changes' : 'Create Variable'}
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
