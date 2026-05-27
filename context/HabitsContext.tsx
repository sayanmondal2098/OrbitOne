import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HABITS_STORAGE_KEY = 'orbitone_habits_v2';

export interface Habit {
    id: number | string;
    name: string;
    description?: string;
    streak: number;
    maxStreak: number;
    icon: string;
    color: string;
    goal: string;                  // e.g. "30 min", "8 glasses", "20 pages"
    history: { [date: string]: boolean }; // YYYY-MM-DD -> completed (true/false)
    createdAt: string;             // YYYY-MM-DD
}

interface HabitsContextType {
    habits: Habit[];
    addHabit: (name: string, icon: string, color: string, goal: string, description?: string) => void;
    editHabit: (id: number | string, updates: Partial<Habit>) => void;
    deleteHabit: (id: number | string) => void;
    toggleHabitCompletion: (id: number | string, dateStr: string) => void;
    loading: boolean;
}

const HabitsContext = createContext<HabitsContextType | undefined>(undefined);

// Helper to get local date ISO string (YYYY-MM-DD)
export const getLocalDateString = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

// Self-healing streak calculator based on completion history
export const calculateHabitStreak = (history: { [date: string]: boolean }, referenceDateStr: string) => {
    let streak = 0;
    const checkDate = new Date(referenceDateStr + 'T12:00:00');
    
    const formatDate = (date: Date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const todayStr = referenceDateStr;
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayStr = formatDate(checkDate);

    const currentCheckDate = new Date(todayStr + 'T12:00:00');
    
    if (history[todayStr]) {
        // Start from today
    } else if (history[yesterdayStr]) {
        // Start from yesterday
        currentCheckDate.setDate(currentCheckDate.getDate() - 1);
    } else {
        return 0; // Streak broken or not active
    }

    while (true) {
        const dateKey = formatDate(currentCheckDate);
        if (history[dateKey]) {
            streak++;
            currentCheckDate.setDate(currentCheckDate.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
};

// Calculate all-time max streak based on completion history
export const calculateMaxStreak = (history: { [date: string]: boolean }) => {
    let maxStreak = 0;
    let currentStreak = 0;
    
    const completedDates = Object.keys(history)
        .filter(dateKey => history[dateKey])
        .sort();
        
    if (completedDates.length === 0) return 0;
    
    let prevDate: Date | null = null;
    
    for (const dateStr of completedDates) {
        const currDate = new Date(dateStr + 'T12:00:00');
        if (prevDate === null) {
            currentStreak = 1;
        } else {
            const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                currentStreak++;
            } else if (diffDays > 1) {
                currentStreak = 1;
            }
        }
        if (currentStreak > maxStreak) {
            maxStreak = currentStreak;
        }
        prevDate = currDate;
    }
    
    return maxStreak;
};

// Create dynamic initial histories to show active, colorful mock progress
const createInitialHistory = (activeDaysOffset: number[]) => {
    const history: { [date: string]: boolean } = {};
    activeDaysOffset.forEach(offset => {
        history[getLocalDateString(offset)] = true;
    });
    return history;
};

const DEFAULT_HABITS: Habit[] = [
    {
        id: 'habit-1',
        name: 'Morning Exercise',
        description: 'Wake up and get moving to build strength and speed!',
        streak: 12,
        maxStreak: 15,
        icon: 'barbell',
        color: '#6366F1', // Indigo
        goal: '30 min',
        history: createInitialHistory([0, -1, -2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -14, -15, -16]),
        createdAt: getLocalDateString(-20)
    },
    {
        id: 'habit-2',
        name: 'Read Books',
        description: 'Keep growing by loading new pages of ideas every day.',
        streak: 0,
        maxStreak: 8,
        icon: 'book',
        color: '#EC4899', // Pink
        goal: '20 pages',
        history: createInitialHistory([-1, -2, -3, -4, -5, -6, -7, -8, -12, -13]),
        createdAt: getLocalDateString(-15)
    },
    {
        id: 'habit-3',
        name: 'Drink Water',
        description: 'Stay active and hydrated for maximum mental clarity.',
        streak: 5,
        maxStreak: 5,
        icon: 'water',
        color: '#3B82F6', // Blue
        goal: '8 glasses',
        history: createInitialHistory([0, -1, -2, -3, -4, -7, -8, -9]),
        createdAt: getLocalDateString(-10)
    },
    {
        id: 'habit-4',
        name: 'Meditation',
        description: 'Breathe deeply and clear decision fatigue with mindfulness.',
        streak: 0,
        maxStreak: 15,
        icon: 'leaf',
        color: '#10B981', // Green
        goal: '15 min',
        history: createInitialHistory([-2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -12, -13, -14, -15, -16]),
        createdAt: getLocalDateString(-18)
    },
    {
        id: 'habit-5',
        name: 'Journal',
        description: 'Record daily goals, celebrate small wins, and review learning.',
        streak: 1,
        maxStreak: 3,
        icon: 'create',
        color: '#F59E0B', // Amber
        goal: '10 min',
        history: createInitialHistory([0, -2, -3, -4]),
        createdAt: getLocalDateString(-6)
    }
];

export function HabitsProvider({ children }: { children: ReactNode }) {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHabits();
    }, []);

    const loadHabits = async () => {
        try {
            const stored = await AsyncStorage.getItem(HABITS_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as Habit[];
                // Update streaks dynamically on load to reflect actual calendar passage
                const todayStr = getLocalDateString(0);
                const updated = parsed.map(habit => {
                    const streak = calculateHabitStreak(habit.history, todayStr);
                    const maxStreak = calculateMaxStreak(habit.history);
                    return { ...habit, streak, maxStreak };
                });
                setHabits(updated);
            } else {
                // Initialize default habits with computed streaks
                const todayStr = getLocalDateString(0);
                const initialized = DEFAULT_HABITS.map(h => {
                    const streak = calculateHabitStreak(h.history, todayStr);
                    const maxStreak = calculateMaxStreak(h.history);
                    return { ...h, streak, maxStreak };
                });
                setHabits(initialized);
                await AsyncStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(initialized));
            }
        } catch (error) {
            console.error('Error loading habits:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveHabitsState = (updatedHabits: Habit[]) => {
        setTimeout(async () => {
            try {
                await AsyncStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(updatedHabits));
            } catch (error) {
                console.error('Error saving habits:', error);
            }
        }, 200);
    };

    const addHabit = (name: string, icon: string, color: string, goal: string, description?: string) => {
        const todayStr = getLocalDateString(0);
        const newHabit: Habit = {
            id: `habit-${Date.now()}`,
            name,
            description,
            streak: 0,
            maxStreak: 0,
            icon,
            color,
            goal,
            history: {},
            createdAt: todayStr
        };
        const updated = [newHabit, ...habits];
        setHabits(updated);
        saveHabitsState(updated);
    };

    const editHabit = (id: number | string, updates: Partial<Habit>) => {
        const todayStr = getLocalDateString(0);
        const updated = habits.map(h => {
            if (h.id === id) {
                const merged = { ...h, ...updates };
                // Recompute streaks to be bulletproof
                merged.streak = calculateHabitStreak(merged.history, todayStr);
                merged.maxStreak = calculateMaxStreak(merged.history);
                return merged;
            }
            return h;
        });
        setHabits(updated);
        saveHabitsState(updated);
    };

    const deleteHabit = (id: number | string) => {
        const updated = habits.filter(h => h.id !== id);
        setHabits(updated);
        saveHabitsState(updated);
    };

    const toggleHabitCompletion = (id: number | string, dateStr: string) => {
        const todayStr = getLocalDateString(0);
        const updated = habits.map(h => {
            if (h.id === id) {
                const nextHistory = { ...h.history };
                nextHistory[dateStr] = !nextHistory[dateStr];
                
                // Re-evaluate streaks dynamically
                const streak = calculateHabitStreak(nextHistory, todayStr);
                const maxStreak = calculateMaxStreak(nextHistory);
                
                return {
                    ...h,
                    history: nextHistory,
                    streak,
                    maxStreak: Math.max(maxStreak, h.maxStreak)
                };
            }
            return h;
        });
        setHabits(updated);
        saveHabitsState(updated);
    };

    return (
        <HabitsContext.Provider value={{
            habits,
            addHabit,
            editHabit,
            deleteHabit,
            toggleHabitCompletion,
            loading
        }}>
            {children}
        </HabitsContext.Provider>
    );
}

export function useHabits() {
    const context = useContext(HabitsContext);
    if (!context) {
        throw new Error('useHabits must be used within HabitsProvider');
    }
    return context;
}
