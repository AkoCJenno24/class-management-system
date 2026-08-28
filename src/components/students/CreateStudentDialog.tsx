/**
 * Create Student dialog — form to add a student to the global roster.
 * Features:
 * - Real-time auto-validation for required fields (First/Last name) and format checks (Email, Phone, DOB).
 * - Switches tabs automatically to show errors if requirements are not met.
 * - Prevents submission until all requirements are satisfied.
 */
import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { createStudent } from '@/lib/firebase/firestore';
import { uploadStudentAvatar } from '@/lib/firebase/storage';
import { resizeImage } from '@/lib/image-utils';
import { isValidEmail, isValidPhone, isFutureDate } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Loader2,
  Settings2,
  Camera,
  User,
  Phone,
  X,
  Upload,
  AlertCircle,
} from 'lucide-react';
import {
  DEFAULT_GRADE_LEVELS,
  AVATAR_PRESETS,
  AVATAR_COLORS,
  STUDENT_STATUS_OPTIONS,
  STUDENT_GENDER_OPTIONS,
  type StudentStatus,
} from '@/types';
import { capitalizeFirst, resolveAvatarSource } from '@/lib/utils';

interface CreateStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateStudentDialog({ open, onOpenChange }: CreateStudentDialogProps) {
  const { user, teacherProfile } = useAuth();
  const availableGradeLevels =
    teacherProfile?.gradeLevels && teacherProfile.gradeLevels.length > 0
      ? teacherProfile.gradeLevels
      : DEFAULT_GRADE_LEVELS;

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'basic' | 'contact'>('basic');

  // Basic Information Form State
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<string>('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<StudentStatus>('active');
  const [gradeLevel, setGradeLevel] = useState<string>('');
  const [studentId, setStudentId] = useState('');

  // Avatar State
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreset, setAvatarPreset] = useState<string | null>(null);
  const [avatarColor, setAvatarColor] = useState<string>(AVATAR_COLORS[0]);
  const [pendingAvatarBlob, setPendingAvatarBlob] = useState<Blob | null>(null);
  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);

  // Contact Information Form State
  const [parentGuardian, setParentGuardian] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Validation State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'firstName':
        if (!value.trim()) return 'First name is required.';
        if (value.trim().length < 2) return 'Must be at least 2 characters.';
        return '';
      case 'lastName':
        if (!value.trim()) return 'Last name is required.';
        if (value.trim().length < 2) return 'Must be at least 2 characters.';
        return '';
      case 'email':
        if (value.trim() && !isValidEmail(value.trim())) {
          return 'Enter a valid email (e.g. student@school.edu).';
        }
        return '';
      case 'phone':
        if (value.trim() && !isValidPhone(value.trim())) {
          return 'Enter a valid phone number (min 7 digits).';
        }
        return '';
      case 'dateOfBirth':
        if (value.trim() && isFutureDate(value.trim())) {
          return 'Date of birth cannot be in the future.';
        }
        return '';
      default:
        return '';
    }
  };

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleFieldChange = (field: string, value: string, setter: (val: string) => void) => {
    setter(value);
    if (touched[field]) {
      const err = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  // Handle local avatar file selection with client compression
  const handleAvatarFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB.');
      return;
    }

    setIsProcessingAvatar(true);
    try {
      const processed = await resizeImage(file, 400, 400, 0.85);
      setPendingAvatarBlob(processed.file);
      setAvatarUrl(processed.dataUrl);
      setAvatarPreset(null);
      toast.success('Avatar photo selected.');
    } catch {
      toast.error('Failed to process image.');
    } finally {
      setIsProcessingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSelectPreset = (presetId: string) => {
    setAvatarPreset(presetId);
    setAvatarUrl(null);
    setPendingAvatarBlob(null);
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
    setAvatarPreset(null);
    setPendingAvatarBlob(null);
  };

  const resetForm = () => {
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setSuffix('');
    setDateOfBirth('');
    setGender('');
    setAddress('');
    setStatus('active');
    setGradeLevel('');
    setStudentId('');
    setAvatarUrl(null);
    setAvatarPreset(null);
    setAvatarColor(AVATAR_COLORS[0]);
    setPendingAvatarBlob(null);
    setParentGuardian('');
    setEmail('');
    setPhone('');
    setErrors({});
    setTouched({});
    setActiveTab('basic');
  };

  const validateAll = (): { isValid: boolean; firstErrorTab?: 'basic' | 'contact' } => {
    const newErrors: Record<string, string> = {
      firstName: validateField('firstName', firstName),
      lastName: validateField('lastName', lastName),
      email: validateField('email', email),
      phone: validateField('phone', phone),
      dateOfBirth: validateField('dateOfBirth', dateOfBirth),
    };

    setErrors(newErrors);
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      dateOfBirth: true,
    });

    if (newErrors.firstName || newErrors.lastName || newErrors.dateOfBirth) {
      return { isValid: false, firstErrorTab: 'basic' };
    }
    if (newErrors.email || newErrors.phone) {
      return { isValid: false, firstErrorTab: 'contact' };
    }
    return { isValid: true };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const { isValid, firstErrorTab } = validateAll();
    if (!isValid) {
      if (firstErrorTab) setActiveTab(firstErrorTab);
      toast.error('Please resolve required form errors before submitting.');
      return;
    }

    const cleanFirst = capitalizeFirst(firstName.trim());
    const cleanLast = capitalizeFirst(lastName.trim());
    const cleanMiddle = middleName.trim() ? capitalizeFirst(middleName.trim()) : null;
    const cleanSuffix = suffix.trim() || null;

    if (!user) return;

    setIsLoading(true);
    try {
      let finalAvatarUrl: string | null = null;

      // If a custom image was selected, upload it to storage
      if (pendingAvatarBlob) {
        const tempKey = `temp_${Date.now()}`;
        finalAvatarUrl = await uploadStudentAvatar(user.uid, tempKey, pendingAvatarBlob);
      } else if (avatarUrl && !avatarUrl.startsWith('data:')) {
        finalAvatarUrl = avatarUrl;
      }

      await createStudent(user.uid, {
        firstName: cleanFirst,
        middleName: cleanMiddle,
        lastName: cleanLast,
        suffix: cleanSuffix,
        avatarUrl: finalAvatarUrl,
        avatarPreset: finalAvatarUrl ? null : (avatarPreset || null),
        avatarColor,
        dateOfBirth: dateOfBirth.trim() || null,
        gender: gender.trim() || null,
        address: address.trim() || null,
        status,
        parentGuardian: parentGuardian.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        gradeLevel: gradeLevel.trim() || null,
        studentId: studentId.trim() || null,
      });

      toast.success(`Student ${cleanFirst} ${cleanLast} added!`);
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error('Failed to add student. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-2xl w-full p-6">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Add New Student
          </DialogTitle>
          <DialogDescription>
            Enter student details, contact info, and customize their profile avatar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'basic' | 'contact')}>
            <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/60">
              <TabsTrigger value="basic" className="flex items-center gap-2 text-xs font-semibold">
                <User className="h-3.5 w-3.5" />
                <span>Basic Information</span>
                {(errors.firstName || errors.lastName || errors.dateOfBirth) && (
                  <AlertCircle className="h-3.5 w-3.5 text-destructive ml-1" />
                )}
              </TabsTrigger>
              <TabsTrigger value="contact" className="flex items-center gap-2 text-xs font-semibold">
                <Phone className="h-3.5 w-3.5" />
                <span>Contact Information</span>
                {(errors.email || errors.phone) && (
                  <AlertCircle className="h-3.5 w-3.5 text-destructive ml-1" />
                )}
              </TabsTrigger>
            </TabsList>

            {/* ─── TAB 1: BASIC INFORMATION ─── */}
            <TabsContent value="basic" className="space-y-3.5 pt-2 focus-visible:outline-none">
              {/* Profile Photo & Avatar Section */}
              <div className="p-3 rounded-xl border border-border/80 bg-gradient-to-r from-muted/30 via-muted/20 to-background">
                <div className="flex items-center gap-3.5">
                  {/* Avatar Preview */}
                  {(() => {
                    const resolved = resolveAvatarSource({
                      avatarUrl,
                      avatarPreset,
                      avatarColor,
                      firstName: firstName || 'Student',
                      lastName,
                    });
                    const showImage = resolved.mode === 'photo' || resolved.mode === 'preset';

                    return (
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isProcessingAvatar}
                          className="relative block rounded-full p-0.5 ring-2 ring-primary/30 hover:ring-primary/70 focus-visible:outline-none focus-visible:ring-primary transition-all cursor-pointer disabled:cursor-wait"
                          title="Upload photo"
                          aria-label="Upload student photo"
                        >
                          <span className="relative block h-13 w-13 overflow-hidden rounded-full bg-transparent shadow-xs ring-1 ring-border/40">
                            {showImage && resolved.src ? (
                              <img
                                src={resolved.src}
                                alt="Avatar"
                                className="absolute inset-0 block h-full w-full rounded-full object-cover opacity-100"
                                style={{
                                  backgroundColor: 'transparent',
                                  filter: 'none',
                                  mixBlendMode: 'normal',
                                }}
                              />
                            ) : (
                              <span
                                className="absolute inset-0 flex items-center justify-center rounded-full text-sm font-bold text-white select-none"
                                style={{ backgroundColor: resolved.bgColor }}
                              >
                                {resolved.initials}
                              </span>
                            )}

                            {isProcessingAvatar && (
                              <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              </span>
                            )}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isProcessingAvatar}
                          className="absolute -bottom-0.5 -right-0.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs hover:scale-105 active:scale-95 transition-all ring-1.5 ring-background cursor-pointer disabled:cursor-wait"
                          title="Upload photo"
                          aria-label="Upload student photo"
                        >
                          {isProcessingAvatar ? (
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          ) : (
                            <Camera className="h-2.5 w-2.5" />
                          )}
                        </button>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          onChange={handleAvatarFileSelect}
                          className="hidden"
                          aria-hidden="true"
                        />
                      </div>
                    );
                  })()}

                  {/* Preset Options & Color Palette */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">Avatar / Photo</Label>
                      <div className="flex items-center gap-2">
                        {(avatarUrl || avatarPreset) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveAvatar}
                            className="h-5 text-[10px] px-1.5 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-2.5 w-2.5 mr-0.5" />
                            Reset
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-6 text-[11px] px-2 cursor-pointer"
                          disabled={isProcessingAvatar}
                        >
                          <Upload className="h-2.5 w-2.5 mr-1" />
                          Upload Photo
                        </Button>
                      </div>
                    </div>

                    {/* Presets Grid */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                      <span className="text-[10px] text-muted-foreground shrink-0">Presets:</span>
                      {AVATAR_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectPreset(preset.id)}
                          className={`relative h-6 w-6 rounded-full overflow-hidden border transition-all cursor-pointer shrink-0 ${avatarPreset === preset.id
                              ? 'border-primary ring-2 ring-primary/40 scale-110'
                              : 'border-border opacity-70 hover:opacity-100 hover:scale-105'
                            }`}
                          title={preset.label}
                        >
                          <img src={preset.src} alt={preset.label} className="h-full w-full object-cover" />
                        </button>
                      ))}

                      {/* Avatar Initials Color Picker (if no image/preset) */}
                      {!avatarUrl && !avatarPreset && (
                        <>
                          <span className="text-[10px] text-muted-foreground ml-1.5 shrink-0">Color:</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {AVATAR_COLORS.slice(0, 8).map((col) => (
                              <button
                                key={col}
                                type="button"
                                onClick={() => setAvatarColor(col)}
                                className={`h-3.5 w-3.5 rounded-full transition-all cursor-pointer ${avatarColor === col ? 'ring-2 ring-primary ring-offset-1 scale-125' : 'hover:scale-110'
                                  }`}
                                style={{ backgroundColor: col }}
                                title={col}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 1: Name Fields (First, Middle, Last, Suffix) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start">
                <div className="sm:col-span-4 space-y-1">
                  <Label htmlFor="student-first-name" className="text-xs font-medium">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="student-first-name"
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => handleFieldChange('firstName', e.target.value, setFirstName)}
                    onBlur={() => handleBlur('firstName', firstName)}
                    disabled={isLoading}
                    autoFocus
                    required
                    className={`h-8.5 text-xs shadow-2xs ${errors.firstName ? 'border-destructive focus-visible:ring-destructive/30' : ''
                      }`}
                  />
                  {errors.firstName && (
                    <p className="text-[10px] font-medium text-destructive leading-tight">{errors.firstName}</p>
                  )}
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <Label htmlFor="student-middle-name" className="text-xs font-medium text-muted-foreground">
                    Middle Name <span className="text-[10px]">(opt)</span>
                  </Label>
                  <Input
                    id="student-middle-name"
                    placeholder="Marie"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    disabled={isLoading}
                    className="h-8.5 text-xs shadow-2xs"
                  />
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <Label htmlFor="student-last-name" className="text-xs font-medium">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="student-last-name"
                    placeholder="Smith"
                    value={lastName}
                    onChange={(e) => handleFieldChange('lastName', e.target.value, setLastName)}
                    onBlur={() => handleBlur('lastName', lastName)}
                    disabled={isLoading}
                    required
                    className={`h-8.5 text-xs shadow-2xs ${errors.lastName ? 'border-destructive focus-visible:ring-destructive/30' : ''
                      }`}
                  />
                  {errors.lastName && (
                    <p className="text-[10px] font-medium text-destructive leading-tight">{errors.lastName}</p>
                  )}
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <Label htmlFor="student-suffix" className="text-xs font-medium text-muted-foreground">
                    Suffix <span className="text-[10px]">(opt)</span>
                  </Label>
                  <Input
                    id="student-suffix"
                    placeholder="Jr., III"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    disabled={isLoading}
                    className="h-8.5 text-xs shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 2: Date of Birth & Gender & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-start">
                <div className="space-y-1">
                  <Label htmlFor="student-dob" className="text-xs font-medium">
                    Date of Birth
                  </Label>
                  <Input
                    id="student-dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => handleFieldChange('dateOfBirth', e.target.value, setDateOfBirth)}
                    onBlur={() => handleBlur('dateOfBirth', dateOfBirth)}
                    disabled={isLoading}
                    className={`h-8.5 text-xs shadow-2xs ${errors.dateOfBirth ? 'border-destructive focus-visible:ring-destructive/30' : ''
                      }`}
                  />
                  {errors.dateOfBirth && (
                    <p className="text-[10px] font-medium text-destructive leading-tight">{errors.dateOfBirth}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="student-gender" className="text-xs font-medium">
                    Sex / Gender
                  </Label>
                  <Select value={gender} onValueChange={(val) => setGender(val || '')} disabled={isLoading}>
                    <SelectTrigger id="student-gender" className="h-8.5 text-xs w-full shadow-2xs">
                      <SelectValue placeholder="Select gender..." />
                    </SelectTrigger>
                    <SelectContent>
                      {STUDENT_GENDER_OPTIONS.map((g) => (
                        <SelectItem key={g} value={g} className="text-xs">
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="student-status" className="text-xs font-medium">
                    Status
                  </Label>
                  <Select
                    value={status}
                    onValueChange={(val) => setStatus(val as StudentStatus)}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="student-status" className="h-8.5 text-xs w-full shadow-2xs">
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                      {STUDENT_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: opt.dotColor }}
                            />
                            <span>{opt.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: Grade Level, Student ID & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="student-grade-level" className="text-xs font-medium">
                      Grade Level
                    </Label>
                    <Link
                      to="/settings"
                      onClick={() => onOpenChange(false)}
                      className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                    >
                      <Settings2 className="h-2.5 w-2.5" />
                      Presets
                    </Link>
                  </div>
                  <Select
                    value={gradeLevel}
                    onValueChange={(val) => setGradeLevel(val || '')}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="student-grade-level" className="h-8.5 text-xs w-full shadow-2xs">
                      <SelectValue placeholder="Select level..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGradeLevels.map((level) => (
                        <SelectItem key={level} value={level} className="text-xs">
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-4 space-y-1">
                  <Label htmlFor="student-id-number" className="text-xs font-medium">
                    ID / Roll # <span className="text-[10px] text-muted-foreground">(opt)</span>
                  </Label>
                  <Input
                    id="student-id-number"
                    placeholder="e.g., STU-10024"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    disabled={isLoading}
                    className="h-8.5 text-xs shadow-2xs"
                  />
                </div>

                <div className="sm:col-span-4 space-y-1">
                  <Label htmlFor="student-address" className="text-xs font-medium">
                    Home Address <span className="text-[10px] text-muted-foreground">(opt)</span>
                  </Label>
                  <Input
                    id="student-address"
                    placeholder="Street, City, State"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={isLoading}
                    className="h-8.5 text-xs shadow-2xs"
                  />
                </div>
              </div>
            </TabsContent>

            {/* ─── TAB 2: CONTACT INFORMATION ─── */}
            <TabsContent value="contact" className="space-y-3.5 pt-2 focus-visible:outline-none">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
                <p>
                  Contact information is useful for parent-teacher communication, grade reports, and urgent student notices.
                </p>
              </div>

              {/* Parent / Guardian */}
              <div className="space-y-1">
                <Label htmlFor="student-parent-guardian" className="text-xs font-medium">
                  Parent / Guardian Name <span className="text-[10px] text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="student-parent-guardian"
                  placeholder="e.g., Robert & Mary Smith"
                  value={parentGuardian}
                  onChange={(e) => setParentGuardian(e.target.value)}
                  disabled={isLoading}
                  className="h-8.5 text-xs shadow-2xs"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <Label htmlFor="student-email" className="text-xs font-medium">
                  Email Address <span className="text-[10px] text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="student-email"
                  type="email"
                  placeholder="student@school.edu or parent@email.com"
                  value={email}
                  onChange={(e) => handleFieldChange('email', e.target.value, setEmail)}
                  onBlur={() => handleBlur('email', email)}
                  disabled={isLoading}
                  className={`h-8.5 text-xs shadow-2xs ${errors.email ? 'border-destructive focus-visible:ring-destructive/30' : ''
                    }`}
                />
                {errors.email && (
                  <p className="text-[10px] font-medium text-destructive leading-tight">{errors.email}</p>
                )}
              </div>

              {/* Mobile / Phone Number */}
              <div className="space-y-1">
                <Label htmlFor="student-phone" className="text-xs font-medium">
                  Mobile / Phone Number <span className="text-[10px] text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="student-phone"
                  type="tel"
                  placeholder="e.g., +1 (555) 234-5678"
                  value={phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value, setPhone)}
                  onBlur={() => handleBlur('phone', phone)}
                  disabled={isLoading}
                  className={`h-8.5 text-xs shadow-2xs ${errors.phone ? 'border-destructive focus-visible:ring-destructive/30' : ''
                    }`}
                />
                {errors.phone && (
                  <p className="text-[10px] font-medium text-destructive leading-tight">{errors.phone}</p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !firstName.trim() || !lastName.trim()}
              className="cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Adding...
                </>
              ) : (
                'Add Student'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
