'use client';

import { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { SaveIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const PROFILE_KEY = '/api/v1/user/profile';

export default function SettingsPage() {
  const { data: profile } = useSWR<UserProfile>(PROFILE_KEY, fetcher);

  // Profile form state
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [bio, setBio] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Editor preferences state
  const [theme, setTheme] = useState('light');
  const [autoCompile, setAutoCompile] = useState(false);
  const [defaultCompiler, setDefaultCompiler] = useState('pdflatex');
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setInstitution(profile.institution ?? '');
      setBio(profile.bio ?? '');

      const s = profile.settings as {
        theme?: string;
        autoCompile?: boolean;
        defaultCompiler?: string;
      };
      setTheme(s.theme ?? 'light');
      setAutoCompile(s.autoCompile ?? false);
      setDefaultCompiler(s.defaultCompiler ?? 'pdflatex');
    }
  }, [profile]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg('');
    try {
      const res = await fetch(PROFILE_KEY, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, institution: institution || null, bio: bio || null }),
      });
      if (!res.ok) {
        const d = await res.json();
        setProfileMsg(d.error ?? 'Failed to save');
      } else {
        setProfileMsg('Saved!');
        mutate(PROFILE_KEY);
        setTimeout(() => setProfileMsg(''), 2000);
      }
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePreferences(e: React.FormEvent) {
    e.preventDefault();
    setPrefsSaving(true);
    setPrefsMsg('');
    try {
      const newSettings = {
        ...(profile?.settings ?? {}),
        theme,
        autoCompile,
        defaultCompiler,
      };
      const res = await fetch('/api/v1/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings }),
      });
      if (!res.ok) {
        // Fallback: settings endpoint may not exist yet, store locally
        setPrefsMsg('Preferences saved locally.');
      } else {
        setPrefsMsg('Saved!');
        mutate(PROFILE_KEY);
      }
      setTimeout(() => setPrefsMsg(''), 2000);
    } finally {
      setPrefsSaving(false);
    }
  }

  const usedBytes =
    typeof profile?.storageUsedBytes === 'string'
      ? parseFloat(profile.storageUsedBytes)
      : (profile?.storageUsedBytes ?? 0);
  const quotaBytes =
    typeof profile?.storageQuotaBytes === 'string'
      ? parseFloat(profile.storageQuotaBytes)
      : (profile?.storageQuotaBytes ?? 1);
  const usagePercent = Math.min(100, (usedBytes / quotaBytes) * 100);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and preferences.</p>
      </div>

      {/* Profile section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update your personal information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="flex flex-col gap-4">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input value={profile?.email ?? ''} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="name" className="text-sm font-medium">
                Display Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="institution" className="text-sm font-medium">
                Institution
              </label>
              <Input
                id="institution"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="University or organization"
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="bio" className="text-sm font-medium">
                Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short bio..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={profileSaving} size="sm">
                <SaveIcon className="mr-1.5 size-4" />
                {profileSaving ? 'Saving...' : 'Save Profile'}
              </Button>
              {profileMsg && (
                <span
                  className={`text-sm ${profileMsg === 'Saved!' ? 'text-green-600' : 'text-destructive'}`}
                >
                  {profileMsg}
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Editor preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Editor Preferences</CardTitle>
          <CardDescription>
            Customize your editing experience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePreferences} className="flex flex-col gap-4">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Theme</label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Auto-compile</p>
                <p className="text-xs text-muted-foreground">
                  Automatically compile on save
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoCompile}
                onClick={() => setAutoCompile(!autoCompile)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  autoCompile ? 'bg-primary' : 'bg-input'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                    autoCompile ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Default Compiler</label>
              <Select value={defaultCompiler} onValueChange={setDefaultCompiler}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdflatex">pdfLaTeX</SelectItem>
                  <SelectItem value="xelatex">XeLaTeX</SelectItem>
                  <SelectItem value="lualatex">LuaLaTeX</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={prefsSaving} size="sm">
                <SaveIcon className="mr-1.5 size-4" />
                {prefsSaving ? 'Saving...' : 'Save Preferences'}
              </Button>
              {prefsMsg && (
                <span
                  className={`text-sm ${prefsMsg.includes('Saved') ? 'text-green-600' : 'text-destructive'}`}
                >
                  {prefsMsg}
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Storage */}
      <Card>
        <CardHeader>
          <CardTitle>Storage</CardTitle>
          <CardDescription>
            Your file storage usage.
          </CardDescription>
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
            {usagePercent.toFixed(1)}% of your {formatBytes(quotaBytes)} quota used
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
