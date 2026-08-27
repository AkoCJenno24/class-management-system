/**
 * Onboarding page — Multi-step wizard for first-time users.
 * Steps: 1) Personal Info, 2) School Info, 3) Profile Avatar, 4) Grading Scale
 * On completion, updates the Firestore teacher profile.
 */
import { useState, useRef, type FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { completeOnboarding } from '@/lib/firebase/firestore';
import { uploadAvatar } from '@/lib/firebase/storage';
import { resizeImage } from '@/lib/image-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ArrowRight, Check, GraduationCap, Camera, Trash2, Upload, Sparkles, Type } from 'lucide-react';
import {
  AVATAR_COLORS,
  AVATAR_PRESETS,
  GRADING_SCALE_PRESETS,
  DEFAULT_GRADING_SCALE,
  type GradingScale,
} from '@/types';
import { cn, getInitials } from '@/lib/utils';

const TOTAL_STEPS = 4;

type AvatarMode = 'photo' | 'preset' | 'initials';

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, isOnboarded, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [school, setSchool] = useState('');
  const [subject, setSubject] = useState('');
  const [avatarMode, setAvatarMode] = useState<AvatarMode>('preset');
  const [avatarColor, setAvatarColor] = useState<string>(AVATAR_COLORS[0]);
  const [avatarPreset, setAvatarPreset] = useState<string | null>(AVATAR_PRESETS[0].id);
  const [customAvatarDataUrl, setCustomAvatarDataUrl] = useState<string | null>(null);
  const [customAvatarBlob, setCustomAvatarBlob] = useState<Blob | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [gradingScale, setGradingScale] = useState<GradingScale>(DEFAULT_GRADING_SCALE);
  const [selectedScaleKey, setSelectedScaleKey] = useState<string>('numeric100');
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [stepTouched, setStepTouched] = useState<Record<string, boolean>>({});

  // Handle avatar photo selection
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

    setIsProcessingPhoto(true);
    try {
      const processed = await resizeImage(file, 400, 400, 0.85);
      setCustomAvatarDataUrl(processed.dataUrl);
      setCustomAvatarBlob(processed.file);
      setAvatarMode('photo');
      toast.success('Photo ready for avatar!');
    } catch {
      toast.error('Failed to process image. Please try another photo.');
    } finally {
      setIsProcessingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle removing photo
  const handleRemovePhoto = () => {
    setCustomAvatarDataUrl(null);
    setCustomAvatarBlob(null);
    setAvatarMode('preset');
  };

  // Redirect if already onboarded
  if (!authLoading && isOnboarded) {
    return <Navigate to="/" replace />;
  }

  // Redirect if not authenticated
  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  const canProceed = (): boolean => {
    if (step === 1) return firstName.trim() !== '' && lastName.trim() !== '';
    if (step === 2) return school.trim() !== '' && subject.trim() !== '';
    return true;
  };

  const handleNext = () => {
    if (step === 1) {
      const firstErr = firstName.trim() ? '' : 'First name is required.';
      const lastErr = lastName.trim() ? '' : 'Last name is required.';
      setStepTouched({ firstName: true, lastName: true });
      setStepErrors({ firstName: firstErr, lastName: lastErr });
      if (firstErr || lastErr) {
        toast.error('Please enter your first and last name.');
        return;
      }
    }
    if (step === 2) {
      const schoolErr = school.trim() ? '' : 'School name is required.';
      const subjectErr = subject.trim() ? '' : 'Subject taught is required.';
      setStepTouched({ school: true, subject: true });
      setStepErrors({ school: schoolErr, subject: subjectErr });
      if (schoolErr || subjectErr) {
        toast.error('Please enter your school name and teaching subject.');
        return;
      }
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleScaleSelect = (key: string) => {
    setSelectedScaleKey(key);
    setGradingScale(GRADING_SCALE_PRESETS[key]);
  };

  const handleComplete = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      let finalAvatarUrl: string | null = null;
      if (avatarMode === 'photo' && customAvatarBlob) {
        try {
          finalAvatarUrl = await uploadAvatar(user.uid, customAvatarBlob);
        } catch (storageErr) {
          console.warn('Firebase Storage upload failed, falling back to dataUrl:', storageErr);
          finalAvatarUrl = customAvatarDataUrl;
        }
      }

      await completeOnboarding(user.uid, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        school: school.trim(),
        subject: subject.trim(),
        avatarUrl: finalAvatarUrl,
        avatarColor,
        avatarPreset: avatarMode === 'preset' ? avatarPreset : null,
        gradingScale,
      });
      toast.success('Profile set up successfully! Welcome aboard.');
      navigate('/');
    } catch (err: unknown) {
      console.error('Error completing onboarding:', err);
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4 py-8">
      <Card className="w-full max-w-lg border-border/50 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <GraduationCap className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Set up your profile</CardTitle>
          <CardDescription>Step {step} of {TOTAL_STEPS}</CardDescription>

          {/* Progress indicator */}
          <div className="mx-auto mt-4 flex w-full max-w-xs gap-2">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-all duration-300',
                  i + 1 <= step ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>
        </CardHeader>

        <form onSubmit={handleComplete}>
          <CardContent className="space-y-6">
            {/* Step 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Personal Information</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="onboard-first-name" className="text-xs font-medium">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="onboard-first-name"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (stepTouched.firstName) {
                        setStepErrors((prev) => ({
                          ...prev,
                          firstName: e.target.value.trim() ? '' : 'First name is required.',
                        }));
                      }
                    }}
                    onBlur={() => {
                      setStepTouched((prev) => ({ ...prev, firstName: true }));
                      setStepErrors((prev) => ({
                        ...prev,
                        firstName: firstName.trim() ? '' : 'First name is required.',
                      }));
                    }}
                    autoFocus
                    required
                    className={stepErrors.firstName ? 'border-destructive focus-visible:ring-destructive/30' : ''}
                  />
                  {stepErrors.firstName && (
                    <p className="text-xs font-medium text-destructive">{stepErrors.firstName}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="onboard-last-name" className="text-xs font-medium">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="onboard-last-name"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (stepTouched.lastName) {
                        setStepErrors((prev) => ({
                          ...prev,
                          lastName: e.target.value.trim() ? '' : 'Last name is required.',
                        }));
                      }
                    }}
                    onBlur={() => {
                      setStepTouched((prev) => ({ ...prev, lastName: true }));
                      setStepErrors((prev) => ({
                        ...prev,
                        lastName: lastName.trim() ? '' : 'Last name is required.',
                      }));
                    }}
                    required
                    className={stepErrors.lastName ? 'border-destructive focus-visible:ring-destructive/30' : ''}
                  />
                  {stepErrors.lastName && (
                    <p className="text-xs font-medium text-destructive">{stepErrors.lastName}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: School Info */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">School Information</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="onboard-school" className="text-xs font-medium">
                    School Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="onboard-school"
                    placeholder="Springfield Elementary"
                    value={school}
                    onChange={(e) => {
                      setSchool(e.target.value);
                      if (stepTouched.school) {
                        setStepErrors((prev) => ({
                          ...prev,
                          school: e.target.value.trim() ? '' : 'School name is required.',
                        }));
                      }
                    }}
                    onBlur={() => {
                      setStepTouched((prev) => ({ ...prev, school: true }));
                      setStepErrors((prev) => ({
                        ...prev,
                        school: school.trim() ? '' : 'School name is required.',
                      }));
                    }}
                    autoFocus
                    required
                    className={stepErrors.school ? 'border-destructive focus-visible:ring-destructive/30' : ''}
                  />
                  {stepErrors.school && (
                    <p className="text-xs font-medium text-destructive">{stepErrors.school}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="onboard-subject" className="text-xs font-medium">
                    Subject Taught <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="onboard-subject"
                    placeholder="Mathematics"
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      if (stepTouched.subject) {
                        setStepErrors((prev) => ({
                          ...prev,
                          subject: e.target.value.trim() ? '' : 'Subject taught is required.',
                        }));
                      }
                    }}
                    onBlur={() => {
                      setStepTouched((prev) => ({ ...prev, subject: true }));
                      setStepErrors((prev) => ({
                        ...prev,
                        subject: subject.trim() ? '' : 'Subject taught is required.',
                      }));
                    }}
                    required
                    className={stepErrors.subject ? 'border-destructive focus-visible:ring-destructive/30' : ''}
                  />
                  {stepErrors.subject && (
                    <p className="text-xs font-medium text-destructive">{stepErrors.subject}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Avatar Selection */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-semibold">Choose Your Avatar</h3>
                  <p className="text-xs text-muted-foreground">
                    Upload your own photo or pick a character or colored initials.
                  </p>
                </div>

                {/* Live Avatar Preview with Camera Badge */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative group">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="relative cursor-pointer rounded-full p-1 ring-2 ring-primary/25 hover:ring-primary/60 transition-all duration-200"
                      title="Click to upload custom photo avatar"
                    >
                      <Avatar className="h-24 w-24 rounded-full shadow-lg overflow-hidden bg-muted">
                        {avatarMode === 'photo' && customAvatarDataUrl ? (
                          <AvatarImage src={customAvatarDataUrl} alt="Avatar" className="object-cover h-full w-full" />
                        ) : avatarMode === 'preset' && avatarPreset ? (
                          <AvatarImage
                            src={AVATAR_PRESETS.find((p) => p.id === avatarPreset)?.src}
                            alt="Avatar"
                            className="object-cover h-full w-full"
                          />
                        ) : null}
                        <AvatarFallback
                          className="rounded-full text-2xl font-bold text-white"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {getInitials(firstName || 'J', lastName || 'D')}
                        </AvatarFallback>
                      </Avatar>

                      {/* Hover overlay with camera */}
                      <div className="absolute inset-1 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200 backdrop-blur-[1px]">
                        {isProcessingPhoto ? (
                          <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                          <>
                            <Camera className="h-6 w-6 mb-0.5" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider">Upload</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Floating Camera Badge Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingPhoto}
                      className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:scale-110 active:scale-95 transition-all ring-2 ring-background cursor-pointer"
                      title="Upload photo"
                      aria-label="Upload photo avatar"
                    >
                      {isProcessingPhoto ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
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
                </div>

                {/* Avatar mode toggle buttons */}
                <div className="grid grid-cols-3 gap-2 p-1 bg-muted/40 rounded-xl border border-border/50">
                  <button
                    type="button"
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer',
                      avatarMode === 'photo'
                        ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                    onClick={() => {
                      if (!customAvatarDataUrl) {
                        fileInputRef.current?.click();
                      } else {
                        setAvatarMode('photo');
                      }
                    }}
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Upload Photo</span>
                  </button>

                  <button
                    type="button"
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer',
                      avatarMode === 'preset'
                        ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                    onClick={() => setAvatarMode('preset')}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Character</span>
                  </button>

                  <button
                    type="button"
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer',
                      avatarMode === 'initials'
                        ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                    onClick={() => setAvatarMode('initials')}
                  >
                    <Type className="h-3.5 w-3.5" />
                    <span>Initials</span>
                  </button>
                </div>

                {/* Mode: Custom Photo */}
                {avatarMode === 'photo' && (
                  <div className="space-y-3 p-4 rounded-xl border border-border/70 bg-card text-center">
                    {customAvatarDataUrl ? (
                      <div className="space-y-2">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          ✓ Photo uploaded and ready
                        </p>
                        <div className="flex justify-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs cursor-pointer"
                          >
                            <Camera className="mr-1.5 h-3.5 w-3.5" />
                            Change Photo
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemovePhoto}
                            className="text-xs text-destructive hover:text-destructive cursor-pointer"
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-primary/30 rounded-lg p-6 hover:border-primary/60 transition-colors cursor-pointer flex flex-col items-center gap-2"
                      >
                        <div className="p-3 rounded-full bg-primary/10 text-primary">
                          <Upload className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-medium">Click to upload your profile photo</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">PNG, JPG, WebP up to 10MB</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mode: Preset Characters */}
                {avatarMode === 'preset' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground text-center">
                      Pick a preset character avatar:
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {AVATAR_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          className={cn(
                            'flex flex-col items-center gap-2 rounded-xl p-3 transition-all duration-200 hover:bg-accent cursor-pointer border border-transparent',
                            avatarPreset === preset.id
                              ? 'ring-2 ring-primary bg-accent/80 shadow-xs border-border'
                              : 'hover:scale-105'
                          )}
                          onClick={() => setAvatarPreset(preset.id)}
                        >
                          <Avatar className="h-14 w-14 shadow-sm">
                            <AvatarImage src={preset.src} alt={preset.label} className="object-cover" />
                            <AvatarFallback>{preset.label[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium text-muted-foreground">
                            {preset.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mode: Initials */}
                {avatarMode === 'initials' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground text-center">
                      Pick a background color for your initials avatar:
                    </p>
                    <div className="grid grid-cols-6 gap-3 pt-2">
                      {AVATAR_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 cursor-pointer mx-auto shadow-xs',
                            avatarColor === color
                              ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110'
                              : 'opacity-80 hover:opacity-100'
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => setAvatarColor(color)}
                        >
                          {avatarColor === color && (
                            <Check className="h-4 w-4 text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Grading Scale */}
            {step === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Grading Scale</h3>
                <p className="text-sm text-muted-foreground">
                  Choose how you'd like to grade your students. You can change this later in settings.
                </p>

                <div className="space-y-3">
                  {/* Numeric 0-100 */}
                  <button
                    type="button"
                    className={cn(
                      'w-full rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer',
                      selectedScaleKey === 'numeric100'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-primary/50 hover:bg-accent'
                    )}
                    onClick={() => handleScaleSelect('numeric100')}
                  >
                    <div className="font-medium">Numeric (0–100)</div>
                    <div className="text-sm text-muted-foreground">
                      Score out of 100 points. Example: 85/100
                    </div>
                  </button>

                  {/* Numeric 0-20 */}
                  <button
                    type="button"
                    className={cn(
                      'w-full rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer',
                      selectedScaleKey === 'numeric20'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-primary/50 hover:bg-accent'
                    )}
                    onClick={() => handleScaleSelect('numeric20')}
                  >
                    <div className="font-medium">Numeric (0–20)</div>
                    <div className="text-sm text-muted-foreground">
                      Score out of 20 points. Example: 17/20
                    </div>
                  </button>

                  {/* Percentage */}
                  <button
                    type="button"
                    className={cn(
                      'w-full rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer',
                      selectedScaleKey === 'percentage'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-primary/50 hover:bg-accent'
                    )}
                    onClick={() => handleScaleSelect('percentage')}
                  >
                    <div className="font-medium">Percentage</div>
                    <div className="text-sm text-muted-foreground">
                      Display as percentage. Example: 85%
                    </div>
                  </button>

                  {/* US Letter Grades */}
                  <button
                    type="button"
                    className={cn(
                      'w-full rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer',
                      selectedScaleKey === 'letterUS'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-primary/50 hover:bg-accent'
                    )}
                    onClick={() => handleScaleSelect('letterUS')}
                  >
                    <div className="font-medium">Letter Grades (US)</div>
                    <div className="text-sm text-muted-foreground">
                      A+ through F. Example: B+ (87–89%)
                    </div>
                  </button>

                  {/* UK Letter Grades */}
                  <button
                    type="button"
                    className={cn(
                      'w-full rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer',
                      selectedScaleKey === 'letterUK'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-primary/50 hover:bg-accent'
                    )}
                    onClick={() => handleScaleSelect('letterUK')}
                  >
                    <div className="font-medium">Letter Grades (UK)</div>
                    <div className="text-sm text-muted-foreground">
                      A* through F. Example: B (70–79%)
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={step === 1}
                className={step === 1 ? 'invisible' : ''}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Button>

              {step < TOTAL_STEPS ? (
                <Button type="button" onClick={handleNext} disabled={!canProceed()}>
                  Next
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Check className="mr-1 h-4 w-4" />
                      Complete Setup
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
