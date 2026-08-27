/**
 * Onboarding page — Multi-step wizard for first-time users.
 * Steps: 1) Personal Info, 2) School Info, 3) Profile Avatar, 4) Grading Scale
 * On completion, updates the Firestore teacher profile.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { completeOnboarding } from '@/lib/firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ArrowRight, Check, GraduationCap } from 'lucide-react';
import {
  AVATAR_COLORS,
  AVATAR_PRESETS,
  GRADING_SCALE_PRESETS,
  DEFAULT_GRADING_SCALE,
  type GradingScale,
} from '@/types';
import { cn, getInitials } from '@/lib/utils';

const TOTAL_STEPS = 4;

type AvatarMode = 'preset' | 'initials';

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
  const [gradingScale, setGradingScale] = useState<GradingScale>(DEFAULT_GRADING_SCALE);
  const [selectedScaleKey, setSelectedScaleKey] = useState<string>('numeric100');

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
    if (!canProceed()) {
      toast.error('Please fill in all required fields.');
      return;
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
      await completeOnboarding(user.uid, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        school: school.trim(),
        subject: subject.trim(),
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
                <div className="space-y-2">
                  <Label htmlFor="onboard-first-name">First Name</Label>
                  <Input
                    id="onboard-first-name"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboard-last-name">Last Name</Label>
                  <Input
                    id="onboard-last-name"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Step 2: School Info */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">School Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="onboard-school">School Name</Label>
                  <Input
                    id="onboard-school"
                    placeholder="Springfield Elementary"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboard-subject">Subject Taught</Label>
                  <Input
                    id="onboard-subject"
                    placeholder="Mathematics"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Avatar Selection */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Choose Your Avatar</h3>

                {/* Avatar mode toggle */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={avatarMode === 'preset' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAvatarMode('preset')}
                  >
                    Character
                  </Button>
                  <Button
                    type="button"
                    variant={avatarMode === 'initials' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAvatarMode('initials')}
                  >
                    Initials
                  </Button>
                </div>

                {avatarMode === 'preset' ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Pick a character that represents you.
                    </p>

                    {/* Preset avatar grid */}
                    <div className="grid grid-cols-3 gap-4">
                      {AVATAR_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          className={cn(
                            'flex flex-col items-center gap-2 rounded-xl p-3 transition-all duration-200 hover:bg-accent cursor-pointer',
                            avatarPreset === preset.id
                              ? 'ring-2 ring-primary bg-accent'
                              : 'hover:scale-105'
                          )}
                          onClick={() => setAvatarPreset(preset.id)}
                        >
                          <Avatar className="h-16 w-16 shadow-md">
                            <AvatarImage src={preset.src} alt={preset.label} />
                            <AvatarFallback>{preset.label[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium text-muted-foreground">
                            {preset.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Pick a color for your initials avatar.
                    </p>

                    {/* Avatar preview */}
                    <div className="flex justify-center">
                      <Avatar className="h-20 w-20 shadow-lg text-2xl font-bold">
                        <AvatarFallback
                          className="text-white text-xl font-bold"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {getInitials(firstName || 'J', lastName || 'D')}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    {/* Color grid */}
                    <div className="grid grid-cols-6 gap-3">
                      {AVATAR_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 cursor-pointer mx-auto',
                            avatarColor === color
                              ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110'
                              : 'opacity-70 hover:opacity-100'
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
                  </>
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
