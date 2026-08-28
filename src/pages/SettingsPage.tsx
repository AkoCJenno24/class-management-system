/**
 * Settings Page — Manage Teacher Profile, Preset Grade Levels, and System Preferences.
 * Allows teachers to customize their preset Grade Levels list used when enrolling students.
 */
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateTeacherProfile } from '@/lib/firebase/firestore';
import { uploadAvatar } from '@/lib/firebase/storage';
import { resizeImage } from '@/lib/image-utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { showGraceUndoToast } from '@/components/ui/grace-undo-toast';
import { toast } from 'sonner';
import {
  Layers,
  User,
  Plus,
  X,
  RotateCcw,
  Save,
  Loader2,
  GraduationCap,
  Camera,
  Trash2,
} from 'lucide-react';
import { DEFAULT_GRADE_LEVELS, AVATAR_PRESETS, AVATAR_COLORS } from '@/types';
import { resolveAvatarSource } from '@/lib/utils';

export function SettingsPage() {
  const { user, teacherProfile } = useAuth();

  // Profile states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [school, setSchool] = useState('');
  const [subject, setSubject] = useState('');
  const [avatarColor, setAvatarColor] = useState('#6366F1');
  const [avatarPreset, setAvatarPreset] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Grade Levels state
  const [gradeLevels, setGradeLevels] = useState<string[]>(DEFAULT_GRADE_LEVELS);
  const [newGradeLevel, setNewGradeLevel] = useState('');

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingGrades, setIsSavingGrades] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileTouched, setProfileTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (teacherProfile) {
      setFirstName(teacherProfile.firstName || '');
      setLastName(teacherProfile.lastName || '');
      setSchool(teacherProfile.school || '');
      setSubject(teacherProfile.subject || '');
      setAvatarColor(teacherProfile.avatarColor || '#6366F1');
      setAvatarPreset(teacherProfile.avatarPreset || null);
      setAvatarUrl(teacherProfile.avatarUrl || null);
      if (Array.isArray(teacherProfile.gradeLevels) && teacherProfile.gradeLevels.length > 0) {
        setGradeLevels(teacherProfile.gradeLevels);
      } else {
        setGradeLevels(DEFAULT_GRADE_LEVELS);
      }
    }
  }, [teacherProfile]);

  const resolvedAvatar = resolveAvatarSource({
    avatarUrl,
    avatarPreset,
    avatarColor,
    firstName,
    lastName,
    id: user?.uid,
  });
  const showImage = resolvedAvatar.mode === 'photo' || resolvedAvatar.mode === 'preset';

  // Handle uploading custom photo avatar
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, JPEG, WebP, GIF).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size exceeds 10MB limit. Please choose a smaller photo.');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const processed = await resizeImage(file, 400, 400, 0.85);
      setAvatarUrl(processed.dataUrl);
      setAvatarPreset(null);

      if (user) {
        let finalUrl = processed.dataUrl;
        try {
          finalUrl = await uploadAvatar(user.uid, processed.file);
        } catch (storageErr) {
          console.warn('Storage upload fallback to dataUrl:', storageErr);
        }
        setAvatarUrl(finalUrl);
        await updateTeacherProfile(user.uid, {
          avatarUrl: finalUrl,
          avatarPreset: null,
        });
        toast.success('Avatar photo uploaded successfully!');
      }
    } catch (err: unknown) {
      console.error('Error processing avatar image:', err);
      toast.error('Failed to process image. Please try another photo.');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle removing custom avatar photo
  const handleRemoveCustomAvatar = async () => {
    setAvatarUrl(null);
    if (user) {
      try {
        await updateTeacherProfile(user.uid, {
          avatarUrl: null,
        });
        toast.success('Custom avatar photo removed.');
      } catch {
        toast.error('Failed to remove custom avatar.');
      }
    }
  };

  // Handle adding a new grade level to the preset list
  const handleAddGradeLevel = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newGradeLevel.trim();
    if (!trimmed) return;

    if (gradeLevels.some((gl) => gl.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`"${trimmed}" is already in your grade levels preset list.`);
      return;
    }

    const updated = [...gradeLevels, trimmed];
    setGradeLevels(updated);
    setNewGradeLevel('');

    if (user) {
      try {
        await updateTeacherProfile(user.uid, { gradeLevels: updated });
        toast.success(`Added "${trimmed}" to preset grade levels.`);
      } catch {
        toast.error('Failed to save grade level.');
      }
    }
  };

  // Dialog states for deletion & reset
  const [levelToDelete, setLevelToDelete] = useState<string | null>(null);
  const [isResetLevelsOpen, setIsResetLevelsOpen] = useState(false);

  // Handle removing a grade level with Undo
  const handleConfirmRemoveGradeLevel = async () => {
    if (!levelToDelete) return;
    const level = levelToDelete;
    setLevelToDelete(null);

    const updated = gradeLevels.filter((gl) => gl !== level);
    setGradeLevels(updated);

    if (user) {
      try {
        await updateTeacherProfile(user.uid, { gradeLevels: updated });
      } catch {
        toast.error('Failed to update grade levels.');
        return;
      }
    }

    showGraceUndoToast({
      title: 'Grade level removed',
      subtitle: level,
      duration: 5000,
      onUndo: async () => {
        const restored = [...updated, level];
        setGradeLevels(restored);
        if (user) {
          try {
            await updateTeacherProfile(user.uid, { gradeLevels: restored });
            toast.success(`Restored "${level}"`);
          } catch {
            toast.error('Failed to restore grade level.');
          }
        }
      },
    });
  };

  // Reset grade levels to system default with Undo
  const handleConfirmResetDefaults = async () => {
    setIsResetLevelsOpen(false);
    const previous = [...gradeLevels];
    setGradeLevels(DEFAULT_GRADE_LEVELS);

    if (user) {
      setIsSavingGrades(true);
      try {
        await updateTeacherProfile(user.uid, { gradeLevels: DEFAULT_GRADE_LEVELS });
        showGraceUndoToast({
          title: 'Grade levels reset to defaults',
          subtitle: `${DEFAULT_GRADE_LEVELS.length} default presets restored`,
          duration: 5000,
          onUndo: async () => {
            setGradeLevels(previous);
            if (user) {
              try {
                await updateTeacherProfile(user.uid, { gradeLevels: previous });
                toast.success('Restored custom grade levels');
              } catch {
                toast.error('Failed to restore grade levels.');
              }
            }
          },
        });
      } catch {
        toast.error('Failed to reset grade levels.');
      } finally {
        setIsSavingGrades(false);
      }
    }
  };

  // Save profile information
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const firstErr = firstName.trim() ? '' : 'First name is required.';
    const lastErr = lastName.trim() ? '' : 'Last name is required.';

    setProfileTouched({ firstName: true, lastName: true });
    setProfileErrors({ firstName: firstErr, lastName: lastErr });

    if (firstErr || lastErr) {
      toast.error('First name and last name are required.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateTeacherProfile(user.uid, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        school: school.trim(),
        subject: subject.trim(),
        avatarColor,
        avatarPreset: avatarUrl ? null : avatarPreset,
        avatarUrl: avatarUrl || null,
      });
      toast.success('Profile settings saved successfully!');
    } catch {
      toast.error('Failed to save profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Account & System Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your teacher profile, customizable grade level presets, and system options.
        </p>
      </div>

      {/* ─── 1. Grade Levels Preset Management ─── */}
      <Card className="border-border shadow-xs">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Preset Grade Levels</CardTitle>
                <CardDescription>
                  These grade levels will appear in the dropdown whenever you add or edit students.
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResetLevelsOpen(true)}
              disabled={isSavingGrades}
              className="text-xs self-start sm:self-auto cursor-pointer"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Restore Defaults
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Add new grade level input */}
          <form onSubmit={handleAddGradeLevel} className="flex gap-2">
            <Input
              placeholder="Add custom grade level (e.g., Pre-K, Grade 10 - Honors, Year 1)..."
              value={newGradeLevel}
              onChange={(e) => setNewGradeLevel(e.target.value)}
              className="max-w-md shadow-xs text-sm"
            />
            <Button type="submit" disabled={!newGradeLevel.trim()} className="shrink-0 cursor-pointer">
              <Plus className="mr-1.5 h-4 w-4" />
              Add Level
            </Button>
          </form>

          {/* Active Grade Levels Tags */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Presets ({gradeLevels.length})
            </Label>
            <div className="flex flex-wrap gap-2 pt-1">
              {gradeLevels.map((level) => (
                <Badge
                  key={level}
                  variant="secondary"
                  className="pl-3 pr-1.5 py-1.5 text-xs font-medium flex items-center gap-1.5 border border-border bg-card hover:bg-accent transition-colors shadow-2xs"
                >
                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                  <span>{level}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (gradeLevels.length <= 1) {
                        toast.error('You must keep at least one grade level.');
                        return;
                      }
                      setLevelToDelete(level);
                    }}
                    className="ml-1 cursor-pointer rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                    title={`Remove ${level}`}
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="sr-only">Remove {level}</span>
                  </button>
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              💡 Tip: Click the ✖ on any tag to remove it, or use the input above to add your school's custom naming conventions.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ─── 2. Teacher Profile Settings ─── */}
      <Card className="border-border shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Teacher Profile</CardTitle>
              <CardDescription>
                Personalize your name, school affiliation, and avatar appearance.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Avatar preview and customization */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-5 rounded-2xl border border-border/80 bg-gradient-to-r from-muted/30 via-muted/20 to-background shadow-xs">
              {/* Avatar with Camera Badge */}
              <div className="relative group shrink-0">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative cursor-pointer rounded-full p-1 ring-2 ring-primary/25 hover:ring-primary/60 transition-all duration-200"
                  title="Click to upload custom photo avatar"
                >
                  <div
                    className="h-20 w-20 rounded-full shadow-md overflow-hidden flex items-center justify-center select-none ring-1 ring-border/40"
                    style={{
                      backgroundColor: showImage ? 'transparent' : resolvedAvatar.bgColor,
                    }}
                  >
                    {showImage && resolvedAvatar.src ? (
                      <img src={resolvedAvatar.src} alt="Avatar" className="object-cover h-full w-full rounded-full" />
                    ) : (
                      <span className="text-xl font-bold text-white select-none">
                        {resolvedAvatar.initials}
                      </span>
                    )}
                  </div>

                  {/* Hover dark overlay with camera */}
                  <div className="absolute inset-1 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200 backdrop-blur-[1px]">
                    {isUploadingAvatar ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Camera className="h-5 w-5 mb-0.5" />
                        <span className="text-[9px] font-semibold uppercase tracking-wider">Change</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Floating Camera Badge Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:scale-110 active:scale-95 transition-all ring-2 ring-background cursor-pointer"
                  title="Upload photo"
                  aria-label="Upload photo avatar"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  onChange={handleAvatarFileSelect}
                  className="hidden"
                  aria-hidden="true"
                />
              </div>

              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold">Avatar & Photo</h4>
                    <p className="text-xs text-muted-foreground">
                      Upload your own photo or pick a character or color preset.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="text-xs cursor-pointer h-8"
                    >
                      <Camera className="mr-1.5 h-3.5 w-3.5 text-primary" />
                      {avatarUrl ? 'Change Photo' : 'Upload Photo'}
                    </Button>

                    {avatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveCustomAvatar}
                        className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer h-8"
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>

                {/* Preset Avatars & Initials */}
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground">Presets:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarUrl(null);
                        setAvatarPreset(null);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer transition-all ${
                        avatarPreset === null && !avatarUrl
                          ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                          : 'bg-card text-foreground hover:bg-accent border-border'
                      }`}
                    >
                      Initials Avatar
                    </button>
                    {AVATAR_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setAvatarUrl(null);
                          setAvatarPreset(preset.id);
                        }}
                        className={`relative p-1 rounded-lg border transition-all cursor-pointer ${
                          avatarPreset === preset.id && !avatarUrl
                            ? 'border-primary ring-2 ring-primary/40 bg-accent scale-105 shadow-xs'
                            : 'border-border bg-card hover:bg-accent'
                        }`}
                        title={preset.label}
                      >
                        <img src={preset.src} alt={preset.label} className="h-6 w-6 rounded-md object-cover" />
                      </button>
                    ))}
                  </div>

                  {/* Color picker for initials avatar */}
                  {!avatarUrl && avatarPreset === null && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-muted-foreground">Initials Color:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {AVATAR_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setAvatarColor(c)}
                            className={`h-5 w-5 rounded-full cursor-pointer transition-all ${
                              avatarColor === c ? 'ring-2 ring-primary ring-offset-1 scale-110' : 'opacity-80 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="settings-first-name" className="text-xs font-medium">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="settings-first-name"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (profileTouched.firstName) {
                      setProfileErrors((prev) => ({
                        ...prev,
                        firstName: e.target.value.trim() ? '' : 'First name is required.',
                      }));
                    }
                  }}
                  onBlur={() => {
                    setProfileTouched((prev) => ({ ...prev, firstName: true }));
                    setProfileErrors((prev) => ({
                      ...prev,
                      firstName: firstName.trim() ? '' : 'First name is required.',
                    }));
                  }}
                  disabled={isSavingProfile}
                  required
                  className={profileErrors.firstName ? 'border-destructive focus-visible:ring-destructive/30' : ''}
                />
                {profileErrors.firstName && (
                  <p className="text-xs font-medium text-destructive">{profileErrors.firstName}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-last-name" className="text-xs font-medium">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="settings-last-name"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (profileTouched.lastName) {
                      setProfileErrors((prev) => ({
                        ...prev,
                        lastName: e.target.value.trim() ? '' : 'Last name is required.',
                      }));
                    }
                  }}
                  onBlur={() => {
                    setProfileTouched((prev) => ({ ...prev, lastName: true }));
                    setProfileErrors((prev) => ({
                      ...prev,
                      lastName: lastName.trim() ? '' : 'Last name is required.',
                    }));
                  }}
                  disabled={isSavingProfile}
                  required
                  className={profileErrors.lastName ? 'border-destructive focus-visible:ring-destructive/30' : ''}
                />
                {profileErrors.lastName && (
                  <p className="text-xs font-medium text-destructive">{profileErrors.lastName}</p>
                )}
              </div>
            </div>

            {/* School & Subject */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="settings-school">School / Institution</Label>
                <Input
                  id="settings-school"
                  placeholder="e.g., Oakridge Academy"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  disabled={isSavingProfile}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-subject">Primary Teaching Subject</Label>
                <Input
                  id="settings-subject"
                  placeholder="e.g., Mathematics, Science, Literature"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isSavingProfile}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSavingProfile} className="cursor-pointer shadow-xs">
                {isSavingProfile ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Profile Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Remove Grade Level Dialog */}
      <ConfirmDeleteDialog
        open={Boolean(levelToDelete)}
        onOpenChange={(open) => !open && setLevelToDelete(null)}
        title="Remove Grade Level Preset?"
        itemName={levelToDelete || ''}
        description={
          levelToDelete ? (
            <>
              Are you sure you want to remove preset{' '}
              <span className="font-semibold text-foreground">"{levelToDelete}"</span>? You will
              have a 5-second grace period with Undo to restore it.
            </>
          ) : undefined
        }
        confirmText="Remove Preset"
        onConfirm={handleConfirmRemoveGradeLevel}
      />

      {/* Reset Defaults Dialog */}
      <ConfirmDeleteDialog
        open={isResetLevelsOpen}
        onOpenChange={setIsResetLevelsOpen}
        icon="warning"
        title="Restore Default Presets?"
        description="Reset your grade level presets back to the standard system defaults? Any custom presets will be replaced, but you will have a 5-second grace period with Undo."
        confirmText="Restore Defaults"
        isLoading={isSavingGrades}
        onConfirm={handleConfirmResetDefaults}
      />
    </div>
  );
}
