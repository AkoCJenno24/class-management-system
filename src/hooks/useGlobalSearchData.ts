import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  onClassesChange,
  onStudentsChange,
  onStickyNotesChange,
  onTodoItemsChange,
  onAllActivitiesChange,
} from '@/lib/firebase/firestore';
import type { Class, Student, StickyNote, TodoItem, Activity } from '@/types';

export function useGlobalSearchData() {
  const { user } = useAuth();

  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setClasses([]);
      setStudents([]);
      setNotes([]);
      setTodos([]);
      setActivities([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const unsubClasses = onClassesChange(user.uid, (data) => {
      if (isMounted) setClasses(data);
    });

    const unsubStudents = onStudentsChange(user.uid, (data) => {
      if (isMounted) setStudents(data);
    });

    const unsubNotes = onStickyNotesChange(user.uid, (data) => {
      if (isMounted) setNotes(data);
    });

    const unsubTodos = onTodoItemsChange(user.uid, (data) => {
      if (isMounted) setTodos(data);
    });

    const unsubActivities = onAllActivitiesChange(user.uid, (data) => {
      if (isMounted) {
        setActivities(data);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubClasses();
      unsubStudents();
      unsubNotes();
      unsubTodos();
      unsubActivities();
    };
  }, [user]);

  return {
    classes,
    students,
    notes,
    todos,
    activities,
    isLoading,
  };
}
