'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { useTheme } from 'next-themes';
import {
  SaveIcon,
  UserIcon,
  LockIcon,
  CodeIcon,
  BellIcon,
  PaletteIcon,
  AlertTriangleIcon,
  EyeIcon,
  EyeOffIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
  Loader2Icon,
  HardDriveIcon,
  CameraIcon,
  TrashIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface UserProfile {
  id: string;
  name: string;
  email: string;
  institution?: string | null;
  bio?: string | null;
  settings: Record<string, unknown>;
  storageUsedBytes: number | string;
  storageQuotaBytes: number | string;
  role: string;
}

function formatBytes(bytes: number | string): string {
  const n = typeof bytes === 'string' ? parseFloat(bytes) : bytes;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
  if (score <= 2) return { score: 2, label: 'Fair', color: 'bg-orange-500' };
  if (score <= 3) return { score: 3, label: 'Good', color: 'bg-yellow-500' };
  if (score <= 4) return { score: 4, label: 'Strong', color: 'bg-green-500' };
  return { score: 5, label: 'Very Strong', color: 'bg-emerald-500' };
}

/* ---------- Password Input with show/hide toggle ---------- */
function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="pr-9"
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? (
          <EyeOffIcon className="size-4" />
        ) : (
          <EyeIcon className="size-4" />
        )}
      </button>
    </div>
  );
}

/* ---------- Status message component ---------- */
function StatusMessage({ message, isSuccess }: { message: string; isSuccess: boolean }) {
  if (!message) return null;
  return (
    <span
      className={`text-sm ${isSuccess ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}
    >
      {message}
    </span>
  );
}

const PROFILE_KEY = '/api/v1/user/profile';

export default function SettingsPage() {
  const { data: profile } = useSWR<UserProfile>(PROFILE_KEY, fetcher);
  const { theme: currentTheme, setTheme: setAppTheme } = useTheme();

  // ---- Profile state ----
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [bio, setBio] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // ---- Password state ----
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');

  // ---- Editor preferences state ----
  const [fontSize, setFontSize] = useState('14');
  const [tabSize, setTabSize] = useState('4');
  const [wordWrap, setWordWrap] = useState(true);
  const [lineNumbers, setLineNumbers] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState('2');
  const [keyBindings, setKeyBindings] = useState('default');
  const [autoCompile, setAutoCompile] = useState(false);
  const [defaultCompiler, setDefaultCompiler] = useState('pdflatex');
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState('');

  // ---- Notification preferences state ----
  const [notifyInvitation, setNotifyInvitation] = useState(true);
  const [notifyCompilation, setNotifyCompilation] = useState(false);
  const [notifyVersionRestore, setNotifyVersionRestore] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMsg, setNotifMsg] = useState('');

  // ---- Appearance state ----
  const [appearanceSaving, setAppearanceSaving] = useState(false);
  const [appearanceMsg, setAppearanceMsg] = useState('');

  // ---- Delete account state ----
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Hydrate form from profile
  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setInstitution(profile.institution ?? '');
      setBio(profile.bio ?? '');

      const s = profile.settings as Record<string, unknown>;
      setFontSize(String(s.fontSize ?? '14'));
      setTabSize(String(s.tabSize ?? '4'));
      setWordWrap(s.wordWrap !== false);
      setLineNumbers(s.lineNumbers !== false);
      setAutoSaveInterval(String(s.autoSaveInterval ?? '2'));
      setKeyBindings(String(s.keyBindings ?? 'default'));
      setAutoCompile(!!s.autoCompile);
      setDefaultCompiler(String(s.defaultCompiler ?? 'pdflatex'));
      setNotifyInvitation(s.notifyInvitation !== false);
      setNotifyCompilation(!!s.notifyCompilation);
      setNotifyVersionRestore(s.notifyVersionRestore !== false);
    }
  }, [profile]);

  // Password strength
  const passwordStrength = useMemo(
    () => (newPassword ? getPasswordStrength(newPassword) : null),
    [newPassword]
  );
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  // Storage
  const usedBytes =
    typeof profile?.storageUsedBytes === 'string'
      ? parseFloat(profile.storageUsedBytes)
      : (profile?.storageUsedBytes ?? 0);
  const quotaBytes =
    typeof profile?.storageQuotaBytes === 'string'
      ? parseFloat(profile.storageQuotaBytes)
      : (profile?.storageQuotaBytes ?? 1);
  const usagePercent = Math.min(100, (usedBytes / quotaBytes) * 100);

  // ---- Handlers ----
  const saveProfile = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setProfileSaving(true);
      setProfileMsg('');
      try {
        const res = await fetch(PROFILE_KEY, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            institution: institution || null,
            bio: bio || null,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          setProfileMsg(d.error ?? 'Failed to save');
          toast.error(d.error ?? 'Failed to save profile');
        } else {
          setProfileMsg('Saved!');
          mutate(PROFILE_KEY);
          toast.success('Settings saved');
          setTimeout(() => setProfileMsg(''), 2000);
        }
      } finally {
        setProfileSaving(false);
      }
    },
    [name, institution, bio]
  );

  const changePassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
        setPasswordMsg('Passwords do not match');
        return;
      }
      if (newPassword.length < 8) {
        setPasswordMsg('Password must be at least 8 characters');
        return;
      }
      setPasswordSaving(true);
      setPasswordMsg('');
      try {
        const res = await fetch('/api/v1/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setPasswordMsg(d.error ?? 'Failed to change password');
          toast.error(d.error ?? 'Failed to change password');
        } else {
          setPasswordMsg('Password changed successfully!');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          toast.success('Settings saved');
          setTimeout(() => setPasswordMsg(''), 3000);
        }
      } finally {
        setPasswordSaving(false);
      }
    },
    [currentPassword, newPassword, confirmPassword]
  );

  const saveEditorPreferences = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setPrefsSaving(true);
      setPrefsMsg('');
      try {
        const newSettings = {
          ...(profile?.settings ?? {}),
          fontSize: Number(fontSize),
          tabSize: Number(tabSize),
          wordWrap,
          lineNumbers,
          autoSaveInterval: autoSaveInterval === 'disabled' ? null : Number(autoSaveInterval),
          keyBindings,
          autoCompile,
          defaultCompiler,
        };
        const res = await fetch('/api/v1/user/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: newSettings }),
        });
        if (!res.ok) {
          setPrefsMsg('Preferences saved locally.');
          toast.error('Failed to save preferences to server');
        } else {
          setPrefsMsg('Saved!');
          mutate(PROFILE_KEY);
          toast.success('Settings saved');
        }
        setTimeout(() => setPrefsMsg(''), 2000);
      } finally {
        setPrefsSaving(false);
      }
    },
    [
      profile?.settings,
      fontSize,
      tabSize,
      wordWrap,
      lineNumbers,
      autoSaveInterval,
      keyBindings,
      autoCompile,
      defaultCompiler,
    ]
  );

  const saveNotificationPreferences = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setNotifSaving(true);
      setNotifMsg('');
      try {
        const newSettings = {
          ...(profile?.settings ?? {}),
          notifyInvitation,
          notifyCompilation,
          notifyVersionRestore,
        };
        const res = await fetch('/api/v1/user/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: newSettings }),
        });
        if (!res.ok) {
          setNotifMsg('Preferences saved locally.');
          toast.error('Failed to save notification preferences to server');
        } else {
          setNotifMsg('Saved!');
          mutate(PROFILE_KEY);
          toast.success('Settings saved');
        }
        setTimeout(() => setNotifMsg(''), 2000);
      } finally {
        setNotifSaving(false);
      }
    },
    [profile?.settings, notifyInvitation, notifyCompilation, notifyVersionRestore]
  );

  const saveAppearance = useCallback(
    async (selectedTheme: string) => {
      setAppTheme(selectedTheme);
      setAppearanceSaving(true);
      setAppearanceMsg('');
      try {
        const newSettings = {
          ...(profile?.settings ?? {}),
          theme: selectedTheme,
        };
        const res = await fetch('/api/v1/user/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: newSettings }),
        });
        if (!res.ok) {
          setAppearanceMsg('Theme saved locally.');
          toast.error('Failed to save appearance to server');
        } else {
          setAppearanceMsg('Saved!');
          mutate(PROFILE_KEY);
          toast.success('Settings saved');
        }
        setTimeout(() => setAppearanceMsg(''), 2000);
      } finally {
        setAppearanceSaving(false);
      }
    },
    [profile?.settings, setAppTheme]
  );

  const deleteAccount = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/v1/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        window.location.href = '/login';
      }
    } finally {
      setDeleting(false);
    }
  }, []);

  const initials = useMemo(
    () => getInitials(profile?.name ?? 'U'),
    [profile?.name]
  );

  return (
    <div className="flex flex-col gap-6 max-w-3xl pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account, preferences, and application settings.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile">
            <UserIcon className="size-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <LockIcon className="size-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="editor">
            <CodeIcon className="size-4" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <BellIcon className="size-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <PaletteIcon className="size-4" />
            Appearance
          </TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* PROFILE TAB                                                       */}
        {/* ================================================================ */}
        <TabsContent value="profile">
          <div className="flex flex-col gap-6 mt-4">
            {/* Profile card */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal details. This information may be visible to
                  collaborators.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={saveProfile} className="flex flex-col gap-6">
                  {/* Avatar + Name row */}
                  <div className="flex items-start gap-6">
                    <div className="flex flex-col items-center gap-2">
                      <Avatar size="lg" className="size-20">
                        <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        className="gap-1"
                      >
                        <CameraIcon className="size-3" />
                        Upload
                      </Button>
                    </div>
                    <div className="flex-1 grid gap-4">
                      <div className="grid gap-1.5">
                        <Label htmlFor="name">Display Name</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                        />
                        <p className="text-xs text-muted-foreground">
                          This is how your name will appear to collaborators.
                        </p>
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          value={profile?.email ?? ''}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                          Your email is used for login and cannot be changed.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-1.5">
                    <Label htmlFor="institution">Institution</Label>
                    <Input
                      id="institution"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="University or organization"
                    />
                    <p className="text-xs text-muted-foreground">
                      Your university, company, or research institution.
                    </p>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell others a little about yourself..."
                      rows={3}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      A brief description shown on your profile. Markdown is not supported.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button type="submit" disabled={profileSaving} size="sm">
                      {profileSaving ? (
                        <Loader2Icon className="mr-1.5 size-4 animate-spin" />
                      ) : (
                        <SaveIcon className="mr-1.5 size-4" />
                      )}
                      {profileSaving ? 'Saving...' : 'Save Profile'}
                    </Button>
                    <StatusMessage
                      message={profileMsg}
                      isSuccess={profileMsg === 'Saved!'}
                    />
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Storage card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <HardDriveIcon className="size-5 text-muted-foreground" />
                  <div>
                    <CardTitle>Storage</CardTitle>
                    <CardDescription>Your file storage usage.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Used</span>
                  <span className="font-medium">
                    {formatBytes(usedBytes)} / {formatBytes(quotaBytes)}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${
                      usagePercent > 90
                        ? 'bg-destructive'
                        : usagePercent > 70
                          ? 'bg-yellow-500'
                          : 'bg-primary'
                    }`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {usagePercent.toFixed(1)}% of your {formatBytes(quotaBytes)}{' '}
                  quota used
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ================================================================ */}
        {/* SECURITY TAB                                                      */}
        {/* ================================================================ */}
        <TabsContent value="security">
          <div className="flex flex-col gap-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure. Passwords must
                  be at least 8 characters.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={changePassword} className="flex flex-col gap-5">
                  <div className="grid gap-1.5">
                    <Label htmlFor="current-password">Current Password</Label>
                    <PasswordInput
                      id="current-password"
                      value={currentPassword}
                      onChange={setCurrentPassword}
                      placeholder="Enter your current password"
                      autoComplete="current-password"
                    />
                  </div>

                  <Separator />

                  <div className="grid gap-1.5">
                    <Label htmlFor="new-password">New Password</Label>
                    <PasswordInput
                      id="new-password"
                      value={newPassword}
                      onChange={setNewPassword}
                      placeholder="Enter a new password"
                      autoComplete="new-password"
                    />
                    {/* Password strength indicator */}
                    {newPassword && passwordStrength && (
                      <div className="flex flex-col gap-1.5 mt-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`h-1.5 flex-1 rounded-full transition-colors ${
                                level <= passwordStrength.score
                                  ? passwordStrength.color
                                  : 'bg-muted'
                              }`}
                            />
                          ))}
                        </div>
                        <p
                          className={`text-xs ${
                            passwordStrength.score <= 2
                              ? 'text-red-600 dark:text-red-400'
                              : passwordStrength.score <= 3
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : 'text-green-600 dark:text-green-400'
                          }`}
                        >
                          {passwordStrength.label}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <PasswordInput
                      id="confirm-password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      placeholder="Confirm your new password"
                      autoComplete="new-password"
                    />
                    {passwordsMatch && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Passwords match
                      </p>
                    )}
                    {passwordsMismatch && (
                      <p className="text-xs text-destructive">
                        Passwords do not match
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      type="submit"
                      disabled={
                        passwordSaving ||
                        !currentPassword ||
                        !newPassword ||
                        !confirmPassword
                      }
                      size="sm"
                    >
                      {passwordSaving ? (
                        <Loader2Icon className="mr-1.5 size-4 animate-spin" />
                      ) : (
                        <LockIcon className="mr-1.5 size-4" />
                      )}
                      {passwordSaving ? 'Changing...' : 'Change Password'}
                    </Button>
                    <StatusMessage
                      message={passwordMsg}
                      isSuccess={passwordMsg.includes('successfully')}
                    />
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Danger zone */}
            <Card className="border-destructive/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangleIcon className="size-5 text-destructive" />
                  <div>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    <CardDescription>
                      Irreversible and destructive actions.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <div>
                    <p className="text-sm font-medium">Delete Account</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Permanently delete your account and all associated data.
                      This action cannot be undone.
                    </p>
                  </div>
                  <Dialog>
                    <DialogTrigger
                      render={
                        <Button variant="destructive" size="sm">
                          <TrashIcon className="mr-1.5 size-4" />
                          Delete Account
                        </Button>
                      }
                    />
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                        <DialogDescription>
                          This will permanently delete your account, all your
                          projects, files, and collaboration data. This action
                          is <strong>irreversible</strong>.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-2 py-2">
                        <Label htmlFor="delete-confirm" className="text-sm">
                          Type <span className="font-mono font-semibold">DELETE</span> to
                          confirm
                        </Label>
                        <Input
                          id="delete-confirm"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder="DELETE"
                          autoComplete="off"
                        />
                      </div>
                      <DialogFooter>
                        <DialogClose
                          render={<Button variant="outline" size="sm" />}
                        >
                          Cancel
                        </DialogClose>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deleteConfirmText !== 'DELETE' || deleting}
                          onClick={deleteAccount}
                        >
                          {deleting ? (
                            <Loader2Icon className="mr-1.5 size-4 animate-spin" />
                          ) : (
                            <TrashIcon className="mr-1.5 size-4" />
                          )}
                          {deleting ? 'Deleting...' : 'Delete My Account'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ================================================================ */}
        {/* EDITOR TAB                                                        */}
        {/* ================================================================ */}
        <TabsContent value="editor">
          <div className="flex flex-col gap-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Editor Preferences</CardTitle>
                <CardDescription>
                  Customize how the code editor looks and behaves.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={saveEditorPreferences}
                  className="flex flex-col gap-5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="grid gap-1.5">
                      <Label htmlFor="font-size">Font Size</Label>
                      <Select
                        value={fontSize}
                        onValueChange={(v) => v && setFontSize(v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['12', '14', '16', '18', '20'].map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}px
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Editor font size in pixels.
                      </p>
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor="tab-size">Tab Size</Label>
                      <Select
                        value={tabSize}
                        onValueChange={(v) => v && setTabSize(v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['2', '4', '8'].map((s) => (
                            <SelectItem key={s} value={s}>
                              {s} spaces
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Number of spaces per tab.
                      </p>
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor="key-bindings">Key Bindings</Label>
                      <Select
                        value={keyBindings}
                        onValueChange={(v) => v && setKeyBindings(v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="vim">Vim</SelectItem>
                          <SelectItem value="emacs">Emacs</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Keyboard shortcut scheme for the editor.
                      </p>
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor="auto-save">Auto-Save Interval</Label>
                      <Select
                        value={autoSaveInterval}
                        onValueChange={(v) => v && setAutoSaveInterval(v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 second</SelectItem>
                          <SelectItem value="2">2 seconds</SelectItem>
                          <SelectItem value="5">5 seconds</SelectItem>
                          <SelectItem value="10">10 seconds</SelectItem>
                          <SelectItem value="disabled">Disabled</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        How often your work is automatically saved.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Word Wrap</p>
                        <p className="text-xs text-muted-foreground">
                          Wrap long lines to fit the editor width
                        </p>
                      </div>
                      <Switch
                        checked={wordWrap}
                        onCheckedChange={setWordWrap}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Line Numbers</p>
                        <p className="text-xs text-muted-foreground">
                          Show line numbers in the editor gutter
                        </p>
                      </div>
                      <Switch
                        checked={lineNumbers}
                        onCheckedChange={setLineNumbers}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Auto-Compile</p>
                        <p className="text-xs text-muted-foreground">
                          Automatically compile the document after saving
                        </p>
                      </div>
                      <Switch
                        checked={autoCompile}
                        onCheckedChange={setAutoCompile}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-1.5">
                    <Label>Default Compiler</Label>
                    <Select
                      value={defaultCompiler}
                      onValueChange={(v) => v && setDefaultCompiler(v)}
                    >
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdflatex">pdfLaTeX</SelectItem>
                        <SelectItem value="xelatex">XeLaTeX</SelectItem>
                        <SelectItem value="lualatex">LuaLaTeX</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      The LaTeX engine used for new projects by default.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button type="submit" disabled={prefsSaving} size="sm">
                      {prefsSaving ? (
                        <Loader2Icon className="mr-1.5 size-4 animate-spin" />
                      ) : (
                        <SaveIcon className="mr-1.5 size-4" />
                      )}
                      {prefsSaving ? 'Saving...' : 'Save Preferences'}
                    </Button>
                    <StatusMessage
                      message={prefsMsg}
                      isSuccess={prefsMsg.includes('Saved')}
                    />
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ================================================================ */}
        {/* NOTIFICATIONS TAB                                                 */}
        {/* ================================================================ */}
        <TabsContent value="notifications">
          <div className="flex flex-col gap-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>
                  Choose which events trigger email notifications.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={saveNotificationPreferences}
                  className="flex flex-col gap-4"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Project Invitations</p>
                        <p className="text-xs text-muted-foreground">
                          Receive an email when someone invites you to a project
                        </p>
                      </div>
                      <Switch
                        checked={notifyInvitation}
                        onCheckedChange={setNotifyInvitation}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Compilation Complete</p>
                        <p className="text-xs text-muted-foreground">
                          Get notified when a long-running compilation finishes
                        </p>
                      </div>
                      <Switch
                        checked={notifyCompilation}
                        onCheckedChange={setNotifyCompilation}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Version Restored</p>
                        <p className="text-xs text-muted-foreground">
                          Get notified when a collaborator restores a previous
                          version of a project
                        </p>
                      </div>
                      <Switch
                        checked={notifyVersionRestore}
                        onCheckedChange={setNotifyVersionRestore}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <Button type="submit" disabled={notifSaving} size="sm">
                      {notifSaving ? (
                        <Loader2Icon className="mr-1.5 size-4 animate-spin" />
                      ) : (
                        <SaveIcon className="mr-1.5 size-4" />
                      )}
                      {notifSaving ? 'Saving...' : 'Save Notifications'}
                    </Button>
                    <StatusMessage
                      message={notifMsg}
                      isSuccess={notifMsg.includes('Saved')}
                    />
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ================================================================ */}
        {/* APPEARANCE TAB                                                    */}
        {/* ================================================================ */}
        <TabsContent value="appearance">
          <div className="flex flex-col gap-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>
                  Select a theme for the application. Choose &quot;System&quot; to
                  follow your operating system preference.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Light theme card */}
                    <button
                      type="button"
                      onClick={() => saveAppearance('light')}
                      className={`group relative flex flex-col gap-2 rounded-lg border-2 p-3 transition-colors hover:border-primary/50 ${
                        currentTheme === 'light'
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <SunIcon className="size-4 text-amber-500" />
                        <span className="text-sm font-medium">Light</span>
                      </div>
                      {/* Mini preview */}
                      <div className="rounded-md border bg-white p-2 shadow-sm">
                        <div className="space-y-1.5">
                          <div className="h-2 w-3/4 rounded bg-gray-200" />
                          <div className="h-2 w-1/2 rounded bg-gray-200" />
                          <div className="h-2 w-5/6 rounded bg-gray-100" />
                        </div>
                      </div>
                      {currentTheme === 'light' && (
                        <div className="absolute top-2 right-2 size-2 rounded-full bg-primary" />
                      )}
                    </button>

                    {/* Dark theme card */}
                    <button
                      type="button"
                      onClick={() => saveAppearance('dark')}
                      className={`group relative flex flex-col gap-2 rounded-lg border-2 p-3 transition-colors hover:border-primary/50 ${
                        currentTheme === 'dark'
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <MoonIcon className="size-4 text-indigo-400" />
                        <span className="text-sm font-medium">Dark</span>
                      </div>
                      {/* Mini preview */}
                      <div className="rounded-md border border-gray-700 bg-gray-900 p-2 shadow-sm">
                        <div className="space-y-1.5">
                          <div className="h-2 w-3/4 rounded bg-gray-700" />
                          <div className="h-2 w-1/2 rounded bg-gray-700" />
                          <div className="h-2 w-5/6 rounded bg-gray-800" />
                        </div>
                      </div>
                      {currentTheme === 'dark' && (
                        <div className="absolute top-2 right-2 size-2 rounded-full bg-primary" />
                      )}
                    </button>

                    {/* System theme card */}
                    <button
                      type="button"
                      onClick={() => saveAppearance('system')}
                      className={`group relative flex flex-col gap-2 rounded-lg border-2 p-3 transition-colors hover:border-primary/50 ${
                        currentTheme === 'system'
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <MonitorIcon className="size-4 text-muted-foreground" />
                        <span className="text-sm font-medium">System</span>
                      </div>
                      {/* Mini preview: split */}
                      <div className="rounded-md border overflow-hidden shadow-sm flex">
                        <div className="flex-1 bg-white p-2">
                          <div className="space-y-1.5">
                            <div className="h-2 w-3/4 rounded bg-gray-200" />
                            <div className="h-2 w-1/2 rounded bg-gray-100" />
                          </div>
                        </div>
                        <div className="flex-1 bg-gray-900 border-l border-gray-700 p-2">
                          <div className="space-y-1.5">
                            <div className="h-2 w-3/4 rounded bg-gray-700" />
                            <div className="h-2 w-1/2 rounded bg-gray-800" />
                          </div>
                        </div>
                      </div>
                      {currentTheme === 'system' && (
                        <div className="absolute top-2 right-2 size-2 rounded-full bg-primary" />
                      )}
                    </button>
                  </div>

                  {appearanceMsg && (
                    <StatusMessage
                      message={appearanceMsg}
                      isSuccess={appearanceMsg.includes('Saved')}
                    />
                  )}
                  {appearanceSaving && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2Icon className="size-4 animate-spin" />
                      Saving theme preference...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
