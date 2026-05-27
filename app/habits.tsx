import React, { useState, useMemo, useEffect } from 'react';
import { 
    StyleSheet, 
    View, 
    ScrollView, 
    Text, 
    TouchableOpacity, 
    Modal, 
    TextInput, 
    Alert, 
    Animated, 
    LayoutAnimation, 
    Platform, 
    UIManager,
    KeyboardAvoidingView
} from 'react-native';
import { useSafeAreaInsets, SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useTheme } from '../context/ThemeContext';
import { 
    useHabits, 
    getLocalDateString, 
    calculateHabitStreak, 
    calculateMaxStreak, 
    Habit 
} from '../context/HabitsContext';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PRESET_ICONS = [
    { name: 'barbell-outline', label: 'Exercise', icon: 'barbell-outline' },
    { name: 'book-outline', label: 'Reading', icon: 'book-outline' },
    { name: 'water-outline', label: 'Hydration', icon: 'water-outline' },
    { name: 'leaf-outline', label: 'Mindfulness', icon: 'leaf-outline' },
    { name: 'create-outline', label: 'Journaling', icon: 'create-outline' },
    { name: 'code-slash-outline', label: 'Coding', icon: 'code-slash-outline' },
    { name: 'heart-outline', label: 'Health', icon: 'heart-outline' },
    { name: 'moon-outline', label: 'Sleep', icon: 'moon-outline' },
    { name: 'fast-food-outline', label: 'Diet', icon: 'fast-food-outline' },
    { name: 'happy-outline', label: 'Social', icon: 'happy-outline' }
];

const PRESET_COLORS = [
    { value: '#6366F1', label: 'Indigo' },
    { value: '#10B981', label: 'Emerald' },
    { value: '#3B82F6', label: 'Blue' },
    { value: '#EC4899', label: 'Pink' },
    { value: '#F59E0B', label: 'Amber' },
    { value: '#8B5CF6', label: 'Purple' }
];

const getWeekDates = () => {
    const dates = [];
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday-based
    const monday = new Date(today.setDate(diff));
    
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const fullDate = `${yyyy}-${mm}-${dd}`;
        dates.push({
            dayName: weekDays[i],
            dayNum: d.getDate(),
            fullDate
        });
    }
    return dates;
};

const getPast30Days = () => {
    const dates = [];
    for (let i = 29; i >= 0; i--) {
        dates.push(getLocalDateString(-i));
    }
    return dates;
};

export default function HabitsScreen() {
    const insets = useSafeAreaInsets();
    const { colors, theme } = useTheme();
    const { 
        habits, 
        addHabit, 
        editHabit, 
        deleteHabit, 
        toggleHabitCompletion, 
        loading 
    } = useHabits();

    const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

    // Calendar states
    const weekDates = useMemo(() => getWeekDates(), []);
    const past30Days = useMemo(() => getPast30Days(), []);
    const [selectedDateStr, setSelectedDateStr] = useState(getLocalDateString(0));

    // Modal Visibility States
    const [addEditModalVisible, setAddEditModalVisible] = useState(false);
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);
    const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);

    // Form Field States
    const [isEditing, setIsEditing] = useState(false);
    const [habitName, setHabitName] = useState('');
    const [habitDescription, setHabitDescription] = useState('');
    const [habitGoal, setHabitGoal] = useState('');
    const [habitIcon, setHabitIcon] = useState('barbell-outline');
    const [habitColor, setHabitColor] = useState('#6366F1');

    // Perfect Day Animation values
    const [perfectDayScale] = useState(new Animated.Value(0));

    // Stats calculations
    const selectedDayHabits = habits;
    const completedCount = selectedDayHabits.filter(h => h.history[selectedDateStr]).length;
    const totalCount = selectedDayHabits.length;
    const completionRate = totalCount > 0 ? completedCount / totalCount : 0;
    
    const highestActiveStreak = useMemo(() => {
        if (habits.length === 0) return 0;
        return Math.max(...habits.map(h => h.streak));
    }, [habits]);

    const totalPerfectDays = useMemo(() => {
        if (habits.length === 0) return 0;
        // Count dates where all current habits are completed in past 30 days
        let count = 0;
        past30Days.forEach(dateStr => {
            const dayCompleted = habits.every(h => h.history[dateStr]);
            if (dayCompleted) count++;
        });
        return count;
    }, [habits, past30Days]);

    // Handle confetti triggers for Perfect Day
    useEffect(() => {
        if (completionRate === 1 && totalCount > 0 && selectedDateStr === getLocalDateString(0)) {
            Animated.spring(perfectDayScale, {
                toValue: 1,
                friction: 6,
                tension: 40,
                useNativeDriver: true
            }).start();
        } else {
            Animated.timing(perfectDayScale, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true
            }).start();
        }
    }, [completionRate, totalCount, selectedDateStr]);

    const handleToggleCheck = (id: number | string) => {
        // Triggers clean transition layout collapse/shift
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        toggleHabitCompletion(id, selectedDateStr);
    };

    const openAddModal = () => {
        setIsEditing(false);
        setHabitName('');
        setHabitDescription('');
        setHabitGoal('30 min');
        setHabitIcon('barbell-outline');
        setHabitColor('#6366F1');
        setAddEditModalVisible(true);
    };

    const openEditModal = (habit: Habit) => {
        setSelectedHabit(habit);
        setIsEditing(true);
        setHabitName(habit.name);
        setHabitDescription(habit.description || '');
        setHabitGoal(habit.goal);
        setHabitIcon(habit.icon);
        setHabitColor(habit.color);
        setOptionsModalVisible(false);
        setAddEditModalVisible(true);
    };

    const openOptionsSheet = (habit: Habit) => {
        setSelectedHabit(habit);
        setOptionsModalVisible(true);
    };

    const handleSaveHabit = () => {
        if (!habitName.trim()) {
            Alert.alert('Required Field', 'Please enter a habit title.');
            return;
        }
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        if (isEditing && selectedHabit) {
            editHabit(selectedHabit.id, {
                name: habitName.trim(),
                description: habitDescription.trim() || undefined,
                goal: habitGoal.trim(),
                icon: habitIcon,
                color: habitColor
            });
        } else {
            addHabit(
                habitName.trim(),
                habitIcon,
                habitColor,
                habitGoal.trim() || 'Daily',
                habitDescription.trim() || undefined
            );
        }
        setAddEditModalVisible(false);
    };

    const handleDeleteHabit = (habit: Habit) => {
        Alert.alert(
            'Delete Habit',
            'Are you sure you want to permanently delete this habit? All history streaks will be deleted.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    onPress: () => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        deleteHabit(habit.id);
                        setOptionsModalVisible(false);
                    },
                    style: 'destructive'
                }
            ]
        );
    };

    // Calculate heat grid colors (0 to 1 scaling)
    const getGridColor = (dateStr: string) => {
        const rate = getDayCompletionRate(dateStr);
        if (rate === 0) return theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
        if (rate <= 0.33) return '#86EFAC' + '60'; // Light Green 38%
        if (rate <= 0.66) return '#4ADE80' + 'b0'; // Medium Green 70%
        if (rate < 1.0) return '#22C55E'; // Strong Green
        return '#15803D'; // Deep Emerald Perfect Day
    };

    const getDayCompletionRate = (dateStr: string) => {
        if (habits.length === 0) return 0;
        const done = habits.filter(h => h.history[dateStr]).length;
        return done / habits.length;
    };

    const isDayPerfect = (dateStr: string) => {
        if (habits.length === 0) return false;
        return habits.every(h => h.history[dateStr]);
    };

    return (
        <View style={styles.container}>
            {/* Header with Greenish Dynamic Gradient */}
            <LinearGradient
                colors={['#10B981', '#059669', '#047857']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 16 }]}
            >
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.headerTitle}>Habits Dashboard</Text>
                        <Text style={styles.headerSubtitle}>Consistency rewires the brain</Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.addBtn}
                        onPress={openAddModal}
                    >
                        <Ionicons name="add" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {/* Horizontal Rolling Week Strip */}
                <ScrollView 
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.weekScroll}
                >
                    {weekDates.map((dateObj) => {
                        const dayRate = getDayCompletionRate(dateObj.fullDate);
                        const isPerfect = isDayPerfect(dateObj.fullDate);
                        return (
                            <TouchableOpacity
                                key={dateObj.fullDate}
                                onPress={() => {
                                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                    setSelectedDateStr(dateObj.fullDate);
                                }}
                                style={[
                                    styles.dateItem,
                                    selectedDateStr === dateObj.fullDate && styles.dateItemActive
                                ]}
                            >
                                <Text style={[
                                    styles.dayLabel,
                                    selectedDateStr === dateObj.fullDate && styles.dayLabelActive
                                ]}>
                                    {dateObj.dayName}
                                </Text>
                                <Text style={[
                                    styles.dayNum,
                                    selectedDateStr === dateObj.fullDate && styles.dayNumActive
                                ]}>
                                    {dateObj.dayNum}
                                </Text>

                                {/* Mini green progress indicator dot */}
                                {dayRate > 0 && (
                                    <View 
                                        style={[
                                            styles.dayIndicatorDot,
                                            { backgroundColor: isPerfect ? '#10B981' : '#F59E0B' }
                                        ]}
                                    />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </LinearGradient>

            <ScrollView 
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 140 }}
            >
                {/* Stats Dashboard Card */}
                <View style={styles.statsCardContainer}>
                    <LinearGradient
                        colors={theme === 'dark' ? ['#1F2937', '#111827'] : ['#FFFFFF', '#F3F4F6']}
                        style={styles.statsCard}
                    >
                        {/* Ring visual score */}
                        <View style={styles.statsHeader}>
                            <View style={styles.scoreTextColumn}>
                                <Text style={styles.scorePercentage}>
                                    {Math.round(completionRate * 100)}%
                                </Text>
                                <Text style={styles.scoreLabel}>
                                    {completedCount} of {totalCount} completed
                                </Text>
                            </View>

                            <View style={styles.scoreVisualRing}>
                                <LinearGradient
                                    colors={['#10B981', '#3B82F6']}
                                    style={[styles.ringFill, { transform: [{ scale: 0.8 + completionRate * 0.2 }] }]}
                                >
                                    <Ionicons name={completionRate === 1 ? 'trophy' : 'checkmark-done'} size={24} color="#FFF" />
                                </LinearGradient>
                            </View>
                        </View>

                        {/* Interactive dynamic progress bar */}
                        <View style={styles.progressBarBg}>
                            <LinearGradient
                                colors={['#10B981', '#3B82F6']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.progressBarFill, { width: `${completionRate * 100}%` }]}
                            />
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <Ionicons name="flame" size={24} color="#FF6B6B" />
                                <Text style={styles.statValue}>{highestActiveStreak} Days</Text>
                                <Text style={styles.statLabelSub}>Top Streak</Text>
                            </View>
                            <View style={styles.statBoxDivider} />
                            <View style={styles.statBox}>
                                <Ionicons name="trophy" size={24} color="#F59E0B" />
                                <Text style={styles.statValue}>{totalPerfectDays}</Text>
                                <Text style={styles.statLabelSub}>Perfect Days</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Celebratory perfect day confetti sheet */}
                {completionRate === 1 && totalCount > 0 && selectedDateStr === getLocalDateString(0) && (
                    <Animated.View style={[styles.confettiCard, { transform: [{ scale: perfectDayScale }] }]}>
                        <LinearGradient
                            colors={['#EC4899', '#8B5CF6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.confettiGradient}
                        >
                            <Ionicons name="sparkles" size={32} color="#FFF" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.confettiTitle}>Perfect Day! 🏆</Text>
                                <Text style={styles.confettiSub}>All habits completed today. You are unstoppable!</Text>
                            </View>
                        </LinearGradient>
                    </Animated.View>
                )}

                {/* Active Habits Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        {selectedDateStr === getLocalDateString(0) ? "Today's Schedule" : "Habits Timeline"}
                    </Text>

                    {habits.length > 0 ? (
                        habits.map((habit) => {
                            const isDone = habit.history[selectedDateStr] || false;
                            return (
                                <TouchableOpacity 
                                    key={habit.id}
                                    style={[
                                        styles.habitCard,
                                        { borderLeftColor: habit.color }
                                    ]}
                                    onPress={() => openOptionsSheet(habit)}
                                    activeOpacity={0.8}
                                >
                                    {/* Icon Colored Frame */}
                                    <View style={[styles.habitIconBox, { backgroundColor: habit.color + '15' }]}>
                                        <Ionicons name={habit.icon as any} size={22} color={habit.color} />
                                    </View>

                                    {/* Info Block */}
                                    <View style={styles.habitMetaColumn}>
                                        <Text style={[styles.habitName, isDone && styles.habitNameCompleted]}>
                                            {habit.name}
                                        </Text>
                                        <View style={styles.habitBadgeRow}>
                                            <Text style={styles.habitGoalText}>🎯 {habit.goal}</Text>
                                            
                                            {habit.streak > 0 && (
                                                <View style={styles.streakBadge}>
                                                    <Ionicons name="flame" size={11} color="#FF6B6B" />
                                                    <Text style={styles.streakBadgeText}>{habit.streak} day streak</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    {/* Animated satisfying check circle */}
                                    <TouchableOpacity 
                                        style={[
                                            styles.checkCircle,
                                            isDone && { backgroundColor: habit.color, borderColor: habit.color }
                                        ]}
                                        onPress={() => handleToggleCheck(habit.id)}
                                    >
                                        {isDone && <Ionicons name="checkmark" size={16} color="#FFF" />}
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            );
                        })
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-outline" size={60} color={colors.textTertiary} />
                            <Text style={styles.emptyText}>No habits active</Text>
                            <Text style={styles.emptySubtext}>
                                Create your first daily habit to begin tracking your strengths and statistics!
                            </Text>
                            <TouchableOpacity 
                                style={styles.createFirstBtn}
                                onPress={openAddModal}
                            >
                                <Text style={styles.createFirstText}>Add Habit</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* GitHub-style Heatmap Grid */}
                <View style={styles.section}>
                    <View style={styles.heatmapHeader}>
                        <Text style={styles.sectionTitle}>Consistency Map</Text>
                        <Text style={styles.heatmapSub}>Past 30 Days</Text>
                    </View>
                    
                    <View style={styles.heatmapGrid}>
                        {past30Days.map((dateStr, i) => (
                            <View 
                                key={dateStr}
                                style={[
                                    styles.gridSquare,
                                    { backgroundColor: getGridColor(dateStr) }
                                ]}
                            />
                        ))}
                    </View>
                    <View style={styles.heatmapLegend}>
                        <Text style={styles.legendText}>Less</Text>
                        <View style={[styles.legendBox, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                        <View style={[styles.legendBox, { backgroundColor: '#86EFAC' + '60' }]} />
                        <View style={[styles.legendBox, { backgroundColor: '#4ADE80' + 'b0' }]} />
                        <View style={[styles.legendBox, { backgroundColor: '#22C55E' }]} />
                        <View style={[styles.legendBox, { backgroundColor: '#15803D' }]} />
                        <Text style={styles.legendText}>More</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Custom Modal for Add / Edit */}
            <Modal
                visible={addEditModalVisible}
                animationType="slide"
                transparent={true}
                statusBarTranslucent={true}
                onRequestClose={() => setAddEditModalVisible(false)}
            >
                <SafeAreaProvider>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1 }}
                    >
                        <SafeAreaView style={styles.modalOverlay}>
                            <View style={styles.formCard}>
                            <View style={styles.grabber} />
                            
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {isEditing ? 'Edit Habit' : 'Create Custom Habit'}
                                </Text>
                                <TouchableOpacity onPress={() => setAddEditModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
                                <Text style={styles.fieldLabel}>Habit Title</Text>
                                <TextInput
                                    placeholder="Drink water, workout, code..."
                                    placeholderTextColor={colors.textTertiary}
                                    style={styles.inputField}
                                    value={habitName}
                                    onChangeText={setHabitName}
                                    autoFocus={true}
                                />

                                <Text style={styles.fieldLabel}>Goal Target (e.g. 30 min, 3L)</Text>
                                <TextInput
                                    placeholder="8 glasses, 10 pages..."
                                    placeholderTextColor={colors.textTertiary}
                                    style={styles.inputField}
                                    value={habitGoal}
                                    onChangeText={setHabitGoal}
                                />

                                <Text style={styles.fieldLabel}>Description (Optional)</Text>
                                <TextInput
                                    placeholder="Helpful details to stick to..."
                                    placeholderTextColor={colors.textTertiary}
                                    style={[styles.inputField, { height: 60, textAlignVertical: 'top' }]}
                                    value={habitDescription}
                                    onChangeText={setHabitDescription}
                                    multiline={true}
                                />

                                {/* Color Swatches */}
                                <Text style={styles.fieldLabel}>Color Accent</Text>
                                <View style={styles.swatchRow}>
                                    {PRESET_COLORS.map(col => (
                                        <TouchableOpacity
                                            key={col.value}
                                            onPress={() => setHabitColor(col.value)}
                                            style={[
                                                styles.colorSwatch,
                                                { backgroundColor: col.value },
                                                habitColor === col.value && styles.colorSwatchActive
                                            ]}
                                        >
                                            {habitColor === col.value && (
                                                <Ionicons name="checkmark" size={16} color="#FFF" />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Icon Picker Swatches */}
                                <Text style={styles.fieldLabel}>Category Icon</Text>
                                <View style={styles.iconSwatchRow}>
                                    {PRESET_ICONS.map(ic => (
                                        <TouchableOpacity
                                            key={ic.name}
                                            onPress={() => setHabitIcon(ic.name)}
                                            style={[
                                                styles.iconSwatch,
                                                habitIcon === ic.name && [styles.iconSwatchActive, { borderColor: habitColor }]
                                            ]}
                                        >
                                            <Ionicons 
                                                name={ic.icon as any} 
                                                size={22} 
                                                color={habitIcon === ic.name ? habitColor : colors.textSecondary} 
                                            />
                                            <Text style={[
                                                styles.iconSwatchLabel,
                                                habitIcon === ic.name && { color: habitColor, fontWeight: 'bold' }
                                            ]}>
                                                {ic.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <TouchableOpacity 
                                    style={[styles.submitBtn, { backgroundColor: habitColor }]}
                                    onPress={handleSaveHabit}
                                >
                                    <Text style={styles.submitText}>
                                        {isEditing ? 'Save Changes' : 'Launch Habit'}
                                    </Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </SafeAreaView>
                    </KeyboardAvoidingView>
                </SafeAreaProvider>
            </Modal>

            {/* Habit Action Sheet Options */}
            <Modal
                visible={optionsModalVisible}
                animationType="slide"
                transparent={true}
                statusBarTranslucent={true}
                onRequestClose={() => setOptionsModalVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setOptionsModalVisible(false)}
                >
                    <View style={styles.actionSheet}>
                        <View style={styles.grabber} />
                        
                        {selectedHabit && (
                            <View style={styles.actionSheetContent}>
                                <Text style={styles.sheetTitle}>Habit Settings</Text>
                                <Text style={styles.sheetSubtitle}>{selectedHabit.name}</Text>
                                
                                {selectedHabit.description && (
                                    <Text style={styles.sheetDescText}>"{selectedHabit.description}"</Text>
                                )}

                                <View style={styles.sheetStatsRow}>
                                    <View style={styles.sheetStatBox}>
                                        <Text style={styles.sheetStatValue}>{selectedHabit.streak} Days</Text>
                                        <Text style={styles.sheetStatLabel}>Current Streak</Text>
                                    </View>
                                    <View style={styles.sheetStatBox}>
                                        <Text style={styles.sheetStatValue}>{selectedHabit.maxStreak} Days</Text>
                                        <Text style={styles.sheetStatLabel}>Best Streak</Text>
                                    </View>
                                </View>

                                <View style={styles.separator} />

                                <TouchableOpacity 
                                    style={styles.sheetOption}
                                    onPress={() => openEditModal(selectedHabit)}
                                >
                                    <View style={[styles.sheetOptionIcon, { backgroundColor: colors.primary + '15' }]}>
                                        <Ionicons name="create-outline" size={20} color={colors.primary} />
                                    </View>
                                    <Text style={styles.sheetOptionText}>Edit Habit Details</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={[styles.sheetOption, styles.deleteOption]}
                                    onPress={() => handleDeleteHabit(selectedHabit)}
                                >
                                    <View style={[styles.sheetOptionIcon, { backgroundColor: colors.error + '15' }]}>
                                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                                    </View>
                                    <Text style={[styles.sheetOptionText, { color: colors.error }]}>Delete Habit</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const createStyles = (colors: typeof Colors.light, theme: string) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 22,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#FFF',
        opacity: 0.85,
        marginTop: 2,
    },
    addBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
    },
    weekScroll: {
        gap: 12,
        paddingRight: 10,
    },
    dateItem: {
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        minWidth: 58,
        position: 'relative',
    },
    dateItemActive: {
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    dayLabel: {
        fontSize: 11,
        color: '#FFF',
        opacity: 0.8,
        marginBottom: 4,
    },
    dayLabelActive: {
        color: '#059669',
        fontWeight: '700',
    },
    dayNum: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
    },
    dayNumActive: {
        color: '#059669',
    },
    dayIndicatorDot: {
        position: 'absolute',
        bottom: -2,
        width: 6,
        height: 6,
        borderRadius: 3,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
    },
    scrollView: {
        flex: 1,
    },
    statsCardContainer: {
        paddingHorizontal: 20,
        marginTop: 24,
    },
    statsCard: {
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    statsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    scoreTextColumn: {
        gap: 4,
    },
    scorePercentage: {
        fontSize: 32,
        fontWeight: '900',
        color: colors.text,
    },
    scoreLabel: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    scoreVisualRing: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: colors.surfaceSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    ringFill: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    progressBarBg: {
        height: 8,
        backgroundColor: colors.surfaceSecondary,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 16,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },
    statBox: {
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
    },
    statLabelSub: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    statBoxDivider: {
        width: 1,
        height: 30,
        backgroundColor: colors.divider,
    },
    confettiCard: {
        paddingHorizontal: 20,
        marginTop: 16,
    },
    confettiGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        gap: 12,
        shadowColor: '#EC4899',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6,
    },
    confettiTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
    },
    confettiSub: {
        fontSize: 12,
        color: '#FFF',
        opacity: 0.9,
        marginTop: 2,
        lineHeight: 16,
    },
    section: {
        paddingHorizontal: 20,
        marginTop: 26,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 16,
    },
    habitCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 6,
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    habitIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    habitMetaColumn: {
        flex: 1,
        gap: 4,
    },
    habitName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    habitNameCompleted: {
        textDecorationLine: 'line-through',
        opacity: 0.6,
    },
    habitBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    habitGoalText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: '#FF6B6B' + '12',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    streakBadgeText: {
        fontSize: 11,
        color: '#FF6B6B',
        fontWeight: '700',
    },
    checkCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
        backgroundColor: colors.surfaceSecondary,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 18,
    },
    createFirstBtn: {
        marginTop: 16,
        backgroundColor: '#10B981',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 20,
    },
    createFirstText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#FFF',
    },
    heatmapHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    heatmapSub: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    heatmapGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 16,
        justifyContent: 'center',
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
    },
    gridSquare: {
        width: 24,
        height: 24,
        borderRadius: 6,
    },
    heatmapLegend: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
        marginTop: 10,
        paddingRight: 6,
    },
    legendText: {
        fontSize: 11,
        color: colors.textSecondary,
        marginHorizontal: 2,
    },
    legendBox: {
        width: 12,
        height: 12,
        borderRadius: 3,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    formCard: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 8,
        paddingHorizontal: 20,
        maxHeight: '90%',
    },
    grabber: {
        width: 40,
        height: 5,
        backgroundColor: colors.divider,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 12,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: 'bold',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
        marginTop: 16,
    },
    inputField: {
        backgroundColor: colors.surfaceSecondary,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
        color: colors.text,
    },
    swatchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    colorSwatch: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'transparent',
    },
    colorSwatchActive: {
        borderColor: colors.border,
        transform: [{ scale: 1.1 }],
    },
    iconSwatchRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    iconSwatch: {
        width: '18%',
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: 12,
        paddingVertical: 8,
        alignItems: 'center',
        gap: 4,
    },
    iconSwatchActive: {
        backgroundColor: colors.surface,
        borderWidth: 2,
    },
    iconSwatchLabel: {
        fontSize: 9,
        color: colors.textSecondary,
    },
    submitBtn: {
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    submitText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#FFF',
    },
    actionSheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 8,
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    actionSheetContent: {
        gap: 4,
    },
    sheetTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sheetSubtitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: 4,
    },
    sheetDescText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontStyle: 'italic',
        marginTop: 4,
    },
    sheetStatsRow: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 16,
    },
    sheetStatBox: {
        flex: 1,
        backgroundColor: colors.surfaceSecondary,
        borderRadius: 14,
        padding: 12,
        alignItems: 'center',
        gap: 4,
    },
    sheetStatValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    sheetStatLabel: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    separator: {
        height: 1,
        backgroundColor: colors.divider,
        marginVertical: 16,
    },
    sheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
    },
    sheetOptionIcon: {
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetOptionText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    deleteOption: {
        marginTop: 4,
    },
});
