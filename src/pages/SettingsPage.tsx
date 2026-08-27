/**
 * Settings Page — Manage Teacher Profile, Preset Grade Levels, and System Preferences.
 * Allows teachers to customize their preset Grade Levels list used when enrolling students.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateTeacherProfile } from '@/lib/firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
} from 'lucide-react';
import { DEFAULT_GRADE_LEVELS, AVATAR_PRESETS } from '@/types';
import { getInitials } from '@/lib/utils';

export function SettingsPage() {
  const { user, teacherProfile } = useAuth();

  // Profile states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [school, setSchool] = useState('');
  const [subject, setSubject] = useState('');
  const [avatarColor, setAvatarColor] = useState('#6366F1');
  const [avatarPreset, setAvatarPreset] = useState<string | null>(null);

  // Grade Levels state
  const [gradeLevels, setGradeLevels] = useState<string[]>(DEFAULT_GRADE_LEVELS);
  const [newGradeLevel, setNewGradeLevel] = useState('');

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingGrades, setIsSavingGrades] = useState(false);

  useEffect(() => {
    if (teacherProfile) {
      setFirstName(teacherProfile.firstName || '');
      setLastName(teacherProfile.lastName || '');
      setSchool(teacherProfile.school || '');
      setSubject(teacherProfile.subject || '');
      setAvatarColor(teacherProfile.avatarColor || '#6366F1');
      setAvatarPreset(teacherProfile.avatarPreset || null);
      if (Array.isArray(teacherProfile.gradeLevels) && teacherProfile.gradeLevels.length > 0) {
        setGradeLevels(teacherProfile.gradeLevels);
      } else {
        setGradeLevels(DEFAULT_GRADE_LEVELS);
      }
    }
  }, [teacherProfile]);

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

  // Handle removing a grade level
  const handleRemoveGradeLevel = async (levelToRemove: string) => {
    if (gradeLevels.length <= 1) {
      toast.error('You must keep at least one grade level.');
      return;
    }

    const updated = gradeLevels.filter((gl) => gl !== levelToRemove);
    setGradeLevels(updated);

    if (user) {
      try {
        await updateTeacherProfile(user.uid, { gradeLevels: updated });
        toast.success(`Removed "${levelToRemove}".`);
      } catch {
        toast.error('Failed to update grade levels.');
      }
    }
  };

  // Reset grade levels to system default
  const handleResetDefaultGradeLevels = async () => {
    if (!confirm('Reset grade level presets back to the default list?')) return;
    setGradeLevels(DEFAULT_GRADE_LEVELS);
    if (user) {
      setIsSavingGrades(true);
      try {
        await updateTeacherProfile(user.uid, { gradeLevels: DEFAULT_GRADE_LEVELS });
        toast.success('Grade levels reset to defaults.');
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

    if (!firstName.trim() || !lastName.trim()) {
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
        avatarPreset,
      });
      toast.success('Profile settings saved successfully!');
    } catch {
      toast.error('Failed to save profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const selectedPresetObj = AVATAR_PRESETS.find((p) => p.id === avatarPreset);

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
              onClick={handleResetDefaultGradeLevels}
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
                    onClick={() => handleRemoveGradeLevel(level)}
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-4 rounded-xl border border-border/80 bg-muted/20">
              <Avatar className="h-16 w-16 rounded-xl border-2 border-primary/20 shadow-xs">
                {selectedPresetObj && (
                  <AvatarImage src={selectedPresetObj.src} alt="Avatar" />
                )}
                <AvatarFallback
                  className="rounded-xl text-lg font-bold text-white"
                  style={{ backgroundColor: avatarColor }}
                >
                  {getInitials(firstName, lastName)}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-3 flex-1">
                <div>
                  <h4 className="text-sm font-semibold">Avatar Style</h4>
                  <p className="text-xs text-muted-foreground">
                    Select an avatar preset icon or choose a custom background color for your initials.
                  </p>
                </div>

                {/* Preset Avatars */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAvatarPreset(null)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer transition-all ${
                      avatarPreset === null
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
                      onClick={() => setAvatarPreset(preset.id)}
                      className={`relative p-1 rounded-lg border transition-all cursor-pointer ${
                        avatarPreset === preset.id
                          ? 'border-primary ring-2 ring-primary/40 bg-accent scale-105 shadow-xs'
                          : 'border-border bg-card hover:bg-accent'
                      }`}
                      title={preset.label}
                    >
                      <img src={preset.src} alt={preset.label} className="h-6 w-6 rounded-md" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="settings-first-name">First Name *</Label>
                <Input
                  id="settings-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isSavingProfile}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-last-name">Last Name *</Label>
                <Input
                  id="settings-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isSavingProfile}
                  required
                />
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
    </div>
  );
}
