'use client';

import { useState, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import { SearchIcon, ShieldAlertIcon, ShieldCheckIcon, ShieldIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  institution?: string | null;
  emailVerified: boolean;
  lockedUntil?: string | null;
  createdAt: string;
}

function isSuspended(user: User): boolean {
  if (!user.lockedUntil) return false;
  return new Date(user.lockedUntil) > new Date();
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actioning, setActioning] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }

  const params = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : '';
  const { data } = useSWR<{ users: User[]; total: number }>(
    `/api/v1/admin/users${params}`,
    fetcher,
    { refreshInterval: 15000 },
  );

  async function toggleSuspend(user: User) {
    setActioning(user.id);
    try {
      await fetch(`/api/v1/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspend: !isSuspended(user) }),
      });
      mutate(`/api/v1/admin/users${params}`);
    } finally {
      setActioning(null);
    }
  }

  async function toggleRole(user: User) {
    setActioning(user.id);
    try {
      await fetch(`/api/v1/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: user.role === 'admin' ? 'user' : 'admin' }),
      });
      mutate(`/api/v1/admin/users${params}`);
    } finally {
      setActioning(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            {data?.total ?? 0} total users
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={handleSearchChange}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {isSuspended(user) ? (
                    <Badge variant="destructive">Suspended</Badge>
                  ) : user.emailVerified ? (
                    <Badge variant="outline" className="text-green-600">Active</Badge>
                  ) : (
                    <Badge variant="outline">Unverified</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actioning === user.id}
                      onClick={() => toggleRole(user)}
                      title={user.role === 'admin' ? 'Revoke admin' : 'Make admin'}
                    >
                      {user.role === 'admin' ? (
                        <ShieldIcon className="size-4" />
                      ) : (
                        <ShieldCheckIcon className="size-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant={isSuspended(user) ? 'outline' : 'destructive'}
                      disabled={actioning === user.id}
                      onClick={() => toggleSuspend(user)}
                    >
                      {isSuspended(user) ? (
                        <>
                          <ShieldCheckIcon className="mr-1 size-4" />
                          Unsuspend
                        </>
                      ) : (
                        <>
                          <ShieldAlertIcon className="mr-1 size-4" />
                          Suspend
                        </>
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!data?.users.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
