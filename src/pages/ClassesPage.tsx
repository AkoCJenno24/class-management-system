/**
 * Classes Page — Workspace overview where teacher manages all classes.
 * Supports searching classes and creating new class workspaces.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { onClassesChange } from '@/lib/firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CreateClassDialog } from '@/components/classes/CreateClassDialog';
import { Plus, Search, BookOpen, Users, ArrowRight } from 'lucide-react';
import type { Class } from '@/types';
import { formatDate } from '@/lib/utils';

export function ClassesPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = onClassesChange(user.uid, setClasses);
    return unsub;
  }, [user]);

  const filteredClasses = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.subject.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search classes by name or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 shadow-xs"
          />
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Create Class
        </Button>
      </div>

      {/* Class Grid */}
      {filteredClasses.length === 0 ? (
        <Card className="border-dashed shadow-xs">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4 text-primary">
              <BookOpen className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold">
              {search ? 'No classes match your search' : 'No classes created yet'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
              {search
                ? 'Try a different keyword or clear the search input.'
                : 'Create your first class workspace to organize students, assignments, and grades.'}
            </p>
            {!search && (
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Class
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.map((c) => (
            <Link key={c.id} to={`/classes/${c.id}`}>
              <Card className="h-full border-border shadow-xs hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg font-semibold">{c.name}</CardTitle>
                      <CardDescription className="font-medium text-primary mt-1 text-xs">
                        {c.subject || 'General'}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="font-normal text-xs shrink-0">
                      <Users className="mr-1 h-3 w-3" />
                      {c.studentCount}
                    </Badge>
                  </div>
                  {c.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {c.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-3 mt-2">
                    <span>Created {formatDate(c.createdAt)}</span>
                    <span className="flex items-center text-primary font-medium">
                      Manage <ArrowRight className="ml-1 h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateClassDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
