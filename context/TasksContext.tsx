import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TASKS_STORAGE_KEY = 'orbitone_tasks_v2'; // Bump version key for schema changes

export interface Task {
    id: number;
    title: string;
    priority: 'high' | 'medium' | 'low';
    completed: boolean;
    category: string;
    date: string;               // YYYY-MM-DD
    scheduledTime?: string;      // e.g. "10:30 AM" or "Morning"
    timeSpent: number;          // Total seconds accumulated
    timerRunning: boolean;      // Whether timer is active
}

interface TasksContextType {
    tasks: Task[];
    addTask: (title: string, priority: 'high' | 'medium' | 'low', category: string, scheduledTime?: string) => void;
    editTask: (id: number, updates: Partial<Task>) => void;
    deleteTask: (id: number) => void;
    toggleTaskCompletion: (id: number) => void;
    toggleTimer: (id: number) => void;
    carryOverAll: (yesToToday: boolean) => void;
    moveToToday: (id: number) => void;
    promptDismissed: boolean;
    dismissPrompt: () => void;
    loading: boolean;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

// Helper to get local date ISO string split (YYYY-MM-DD)
export const getLocalDateString = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const DEFAULT_TASKS: Task[] = [
    { id: 1, title: 'Review project proposal', priority: 'high', completed: false, category: 'Work', date: getLocalDateString(-1), scheduledTime: '09:30 AM', timeSpent: 300, timerRunning: false },
    { id: 2, title: 'Team standup at 10 AM', priority: 'medium', completed: false, category: 'Meetings', date: getLocalDateString(0), scheduledTime: '10:00 AM', timeSpent: 0, timerRunning: false },
    { id: 3, title: 'Finish design mockups', priority: 'high', completed: false, category: 'Design', date: getLocalDateString(0), scheduledTime: '02:00 PM', timeSpent: 1200, timerRunning: false },
    { id: 4, title: 'Update project documentation', priority: 'low', completed: true, category: 'Work', date: getLocalDateString(-1), scheduledTime: '04:00 PM', timeSpent: 1800, timerRunning: false },
    { id: 5, title: 'Code review for PR #234', priority: 'medium', completed: false, category: 'Development', date: getLocalDateString(-1), scheduledTime: '11:00 AM', timeSpent: 0, timerRunning: false },
    { id: 6, title: 'Prepare presentation slides', priority: 'high', completed: false, category: 'Work', date: getLocalDateString(0), scheduledTime: '03:30 PM', timeSpent: 0, timerRunning: false },
];

export function TasksProvider({ children }: { children: ReactNode }) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [promptDismissed, setPromptDismissed] = useState(false);
    const [loading, setLoading] = useState(true);

    // Load saved tasks on mount
    useEffect(() => {
        loadTasks();
    }, []);

    // Timer Ticker Engine: ticks every second for any running timer
    useEffect(() => {
        const interval = setInterval(() => {
            setTasks(prevTasks => {
                const running = prevTasks.some(t => t.timerRunning);
                if (!running) return prevTasks;
                
                const updated = prevTasks.map(t => {
                    if (t.timerRunning) {
                        return { ...t, timeSpent: t.timeSpent + 1 };
                    }
                    return t;
                });
                
                // Persist the ticked state in the background periodically (optional, let's keep it in memory during run, but saveTasks on state changes is usually triggered by actions. We'll save to storage when we stop or clean up)
                return updated;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Save tasks to storage when state changes (only on user-triggered events, not every second ticker to save flash memory writes!)
    const loadTasks = async () => {
        try {
            const stored = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
            if (stored) {
                setTasks(JSON.parse(stored));
            } else {
                setTasks(DEFAULT_TASKS);
                await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(DEFAULT_TASKS));
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveTasksState = (updatedTasks: Task[]) => {
        setTimeout(async () => {
            try {
                await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updatedTasks));
            } catch (error) {
                console.error('Error saving tasks:', error);
            }
        }, 300);
    };

    const addTask = (title: string, priority: 'high' | 'medium' | 'low', category: string, scheduledTime?: string) => {
        const newTask: Task = {
            id: Date.now(),
            title,
            priority,
            completed: false,
            category,
            date: getLocalDateString(0),
            scheduledTime,
            timeSpent: 0,
            timerRunning: false
        };
        const updated = [newTask, ...tasks];
        setTasks(updated);
        saveTasksState(updated);
    };

    const editTask = (id: number, updates: Partial<Task>) => {
        const updated = tasks.map(t => t.id === id ? { ...t, ...updates } : t);
        setTasks(updated);
        saveTasksState(updated);
    };

    const deleteTask = (id: number) => {
        const updated = tasks.filter(t => t.id !== id);
        setTasks(updated);
        saveTasksState(updated);
    };

    const toggleTaskCompletion = (id: number) => {
        const updated = tasks.map(t => {
            if (t.id === id) {
                const nextCompleted = !t.completed;
                // Auto-stop timer if completing a task
                return { 
                    ...t, 
                    completed: nextCompleted,
                    timerRunning: nextCompleted ? false : t.timerRunning 
                };
            }
            return t;
        });
        setTasks(updated);
        saveTasksState(updated);
    };

    const toggleTimer = (id: number) => {
        const updated = tasks.map(t => {
            if (t.id === id) {
                const nextRunning = !t.timerRunning;
                return { ...t, timerRunning: nextRunning };
            }
            // Stop other tasks' timers (only one active timer allowed)
            return t.timerRunning ? { ...t, timerRunning: false } : t;
        });
        setTasks(updated);
        saveTasksState(updated);
    };

    const carryOverAll = (yesToToday: boolean) => {
        const today = getLocalDateString(0);
        const updated = tasks.map(t => {
            if (!t.completed && t.date < today) {
                return { 
                    ...t, 
                    date: yesToToday ? today : t.date 
                };
            }
            return t;
        });
        setTasks(updated);
        saveTasksState(updated);
        setPromptDismissed(true);
    };

    const moveToToday = (id: number) => {
        const today = getLocalDateString(0);
        const updated = tasks.map(t => t.id === id ? { ...t, date: today } : t);
        setTasks(updated);
        saveTasksState(updated);
    };

    const dismissPrompt = () => {
        setPromptDismissed(true);
    };

    return (
        <TasksContext.Provider value={{ 
            tasks, 
            addTask, 
            editTask, 
            deleteTask, 
            toggleTaskCompletion, 
            toggleTimer, 
            carryOverAll, 
            moveToToday,
            promptDismissed,
            dismissPrompt,
            loading 
        }}>
            {children}
        </TasksContext.Provider>
    );
}

export function useTasks() {
    const context = useContext(TasksContext);
    if (!context) {
        throw new Error('useTasks must be used within TasksProvider');
    }
    return context;
}
