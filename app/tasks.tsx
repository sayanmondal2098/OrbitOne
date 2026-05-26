import React, { useState } from 'react';
import { 
    StyleSheet, 
    View, 
    ScrollView, 
    Text, 
    TouchableOpacity, 
    TextInput, 
    Modal, 
    Alert, 
    KeyboardAvoidingView, 
    Platform,
    PanResponder,
    Animated,
    Dimensions,
    LayoutAnimation,
    UIManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useTheme } from '../context/ThemeContext';
import { useTasks, Task, getLocalDateString } from '../context/TasksContext';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CATEGORIES = ['Work', 'Meetings', 'Design', 'Development', 'Personal'];
const PRESET_TIMES = ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM', '06:00 PM'];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;

interface SwipeableTaskProps {
    children: React.ReactNode;
    onSwipeLeft: (reset: () => void) => void;
    colors: typeof Colors.light;
}

function SwipeableTask({ children, onSwipeLeft, colors }: SwipeableTaskProps) {
    const translateX = React.useRef(new Animated.Value(0)).current;

    const panResponder = React.useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Respond only to horizontal drags to the left
                return gestureState.dx < -10 && Math.abs(gestureState.dy) < 8;
            },
            onPanResponderMove: (_, gestureState) => {
                // Clamp horizontal moves strictly to negative values (prevent swiping right)
                if (gestureState.dx < 0) {
                    translateX.setValue(gestureState.dx);
                } else {
                    translateX.setValue(0);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                const reset = () => {
                    Animated.spring(translateX, {
                        toValue: 0,
                        friction: 6,
                        tension: 45,
                        useNativeDriver: true,
                    }).start();
                };

                // Trigger delete swipe past threshold
                if (gestureState.dx < -SWIPE_THRESHOLD) {
                    // Momentum spring off-screen
                    Animated.spring(translateX, {
                        toValue: -SCREEN_WIDTH,
                        velocity: gestureState.vx,
                        tension: 50,
                        friction: 8,
                        useNativeDriver: true,
                    }).start(() => {
                        onSwipeLeft(reset);
                    });
                } else {
                    reset();
                }
            },
        })
    ).current;

    // Reset position when items change
    React.useEffect(() => {
        translateX.setValue(0);
    }, [children]);

    const backgroundColor = translateX.interpolate({
        inputRange: [-SCREEN_WIDTH / 2, 0],
        outputRange: [colors.error, 'transparent'],
        extrapolate: 'clamp',
    });

    const rightIconOpacity = translateX.interpolate({
        inputRange: [-50, 0],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    const styles = React.useMemo(() => createSwipeStyles(colors), [colors]);

    return (
        <View style={styles.swipeContainer}>
            <Animated.View style={[styles.swipeBackground, { backgroundColor }]}>
                {/* Empty container on left */}
                <View />

                {/* Right Side (Delete action only) */}
                <Animated.View style={[styles.swipeActionRight, { opacity: rightIconOpacity }]}>
                    <Ionicons name="trash-outline" size={24} color="#FFF" />
                    <Text style={styles.swipeActionText}>Delete</Text>
                </Animated.View>
            </Animated.View>

            <Animated.View
                style={{ transform: [{ translateX }] }}
                {...panResponder.panHandlers}
            >
                {children}
            </Animated.View>
        </View>
    );
}

const createSwipeStyles = (colors: typeof Colors.light) => StyleSheet.create({
    swipeContainer: {
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 16,
        marginHorizontal: 20,
        marginBottom: 12,
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    swipeBackground: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        borderRadius: 16,
    },
    swipeActionRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    swipeActionText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 13,
    },
});

export default function TasksScreen() {
    const { colors } = useTheme();
    const { 
        tasks, 
        addTask, 
        editTask, 
        deleteTask, 
        toggleTaskCompletion, 
        toggleTimer, 
        carryOverAll, 
        moveToToday,
        promptDismissed,
        dismissPrompt 
    } = useTasks();
    
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Collapsible sections state
    const [todayCollapsed, setTodayCollapsed] = useState(false);
    const [pastCollapsed, setPastCollapsed] = useState(false);

    // Modal Visibility States
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);
    const [addEditModalVisible, setAddEditModalVisible] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // Form Field States
    const [isEditing, setIsEditing] = useState(false);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
    const [taskCategory, setTaskCategory] = useState('Work');
    const [taskTime, setTaskTime] = useState('');

    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const todayStr = getLocalDateString(0);

    // Filtered lists
    const filteredTasks = tasks.filter(task => {
        const matchesFilter = filter === 'all' || 
            (filter === 'active' && !task.completed) || 
            (filter === 'completed' && task.completed);
        const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const todaysTasks = filteredTasks.filter(t => t.date >= todayStr);
    const pastTasks = filteredTasks.filter(t => t.date < todayStr);
    const pendingPastTasks = tasks.filter(t => !t.completed && t.date < todayStr);

    const showCarryOverPrompt = pendingPastTasks.length > 0 && !promptDismissed;

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return colors.error;
            case 'medium': return colors.warning;
            case 'low': return colors.success;
            default: return colors.textSecondary;
        }
    };

    const formatTimeSpent = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return [
            String(hours).padStart(2, '0'),
            String(minutes).padStart(2, '0'),
            String(seconds).padStart(2, '0')
        ].join(':');
    };

    const openAddModal = () => {
        setIsEditing(false);
        setTaskTitle('');
        setTaskPriority('medium');
        setTaskCategory('Work');
        setTaskTime('');
        setAddEditModalVisible(true);
    };

    const openEditModal = (task: Task) => {
        setSelectedTask(task);
        setIsEditing(true);
        setTaskTitle(task.title);
        setTaskPriority(task.priority);
        setTaskCategory(task.category);
        setTaskTime(task.scheduledTime || '');
        setOptionsModalVisible(false);
        setAddEditModalVisible(true);
    };

    const openOptions = (task: Task) => {
        setSelectedTask(task);
        setOptionsModalVisible(true);
    };

    const handleSaveTask = () => {
        if (!taskTitle.trim()) {
            Alert.alert('Required Field', 'Please enter a task title to continue.');
            return;
        }
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        if (isEditing && selectedTask) {
            editTask(selectedTask.id, {
                title: taskTitle.trim(),
                priority: taskPriority,
                category: taskCategory,
                scheduledTime: taskTime.trim() || undefined,
            });
        } else {
            addTask(taskTitle.trim(), taskPriority, taskCategory, taskTime.trim() || undefined);
        }
        setAddEditModalVisible(false);
    };

    const handleDeleteTask = (task: Task) => {
        Alert.alert(
            'Delete Task',
            'Are you sure you want to permanently delete this task?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    onPress: () => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        deleteTask(task.id);
                        setOptionsModalVisible(false);
                    }, 
                    style: 'destructive' 
                }
            ]
        );
    };

    const handleSwipeDelete = (task: Task, reset: () => void) => {
        // Defer deletion by 100ms to allow the native momentum-based spring
        // slide-out animation to fully settle, guaranteeing butter-smooth layout collapse!
        setTimeout(() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            deleteTask(task.id);
        }, 100);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <LinearGradient
                colors={['#667EEA', '#764BA2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <Text style={styles.headerTitle}>Tasks</Text>
                <Text style={styles.headerSubtitle}>
                    You have {tasks.filter(t => !t.completed).length} tasks pending
                </Text>
            </LinearGradient>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                {['all', 'active', 'completed'].map(f => (
                    <TouchableOpacity
                        key={f}
                        onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setFilter(f);
                        }}
                        style={[styles.filterTab, filter === f && styles.filterTabActive]}
                    >
                        <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={colors.textSecondary} />
                <TextInput
                    placeholder="Search tasks..."
                    placeholderTextColor={colors.textSecondary}
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={(text) => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setSearchQuery(text);
                    }}
                />
                {searchQuery !== '' && (
                    <TouchableOpacity onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setSearchQuery('');
                    }}>
                        <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Tasks List */}
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                
                {/* Carry Over Confirmation Banner */}
                {showCarryOverPrompt && (
                    <LinearGradient
                        colors={['#EC4899', '#8B5CF6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.carryOverBanner}
                    >
                        <View style={styles.carryOverHeader}>
                            <Ionicons name="hourglass" size={24} color="#FFF" />
                            <Text style={styles.carryOverText}>
                                You have {pendingPastTasks.length} pending tasks from previous days. Carry them over to today?
                            </Text>
                        </View>
                        <View style={styles.carryOverActions}>
                            <TouchableOpacity 
                                style={styles.carryOverButton}
                                onPress={() => {
                                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                    carryOverAll(true);
                                }}
                            >
                                <Text style={styles.carryOverButtonText}>Yes, Move to Today</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.carryOverButton, styles.carryOverButtonSecondary]}
                                onPress={() => {
                                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                    dismissPrompt();
                                }}
                            >
                                <Text style={styles.carryOverButtonTextSecondary}>Keep in Past</Text>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                )}

                {/* Today's Tasks Section */}
                <TouchableOpacity 
                    style={styles.sectionHeaderContainer}
                    onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setTodayCollapsed(!todayCollapsed);
                    }}
                    activeOpacity={0.7}
                >
                    <Ionicons 
                        name={todayCollapsed ? "chevron-forward-outline" : "chevron-down-outline"} 
                        size={18} 
                        color={colors.text} 
                    />
                    <Text style={styles.sectionHeaderText}>Today's Tasks</Text>
                    <Text style={styles.sectionHeaderCount}>{todaysTasks.length}</Text>
                </TouchableOpacity>

                {!todayCollapsed && todaysTasks.map(task => (
                    <SwipeableTask
                        key={task.id}
                        colors={colors}
                        onSwipeLeft={(reset) => handleSwipeDelete(task, reset)}
                    >
                        <View style={[styles.taskCard, task.timerRunning && styles.taskCardActive]}>
                            <TouchableOpacity 
                                style={[styles.checkbox, task.completed && styles.checkboxCompleted]}
                                onPress={() => {
                                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                    toggleTaskCompletion(task.id);
                                }}
                            >
                                {task.completed && <Ionicons name="checkmark" size={20} color="#FFF" />}
                            </TouchableOpacity>
                            
                            <View style={styles.taskContent}>
                                <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
                                    {task.title}
                                </Text>
                                <View style={styles.taskMeta}>
                                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) + '20' }]}>
                                        <Text style={[styles.priorityText, { color: getPriorityColor(task.priority) }]}>
                                            {task.priority}
                                        </Text>
                                    </View>
                                    <Text style={styles.categoryText}>{task.category}</Text>
                                    {task.scheduledTime && (
                                        <View style={styles.scheduledTimeContainer}>
                                            <Ionicons name="alarm-outline" size={13} color={colors.textSecondary} />
                                            <Text style={styles.scheduledTimeText}>{task.scheduledTime}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Interactive Stopwatch */}
                            {!task.completed && (
                                <View style={styles.cardTimerSection}>
                                    <TouchableOpacity 
                                        style={styles.timerButton}
                                        onPress={() => toggleTimer(task.id)}
                                    >
                                        <Ionicons 
                                            name={task.timerRunning ? "pause-circle" : "play-circle"} 
                                            size={26} 
                                            color={task.timerRunning ? colors.error : colors.primary} 
                                        />
                                    </TouchableOpacity>
                                    <Text style={[
                                        styles.timerDisplayText, 
                                        task.timerRunning && styles.timerDisplayTextRunning
                                    ]}>
                                        {formatTimeSpent(task.timeSpent)}
                                    </Text>
                                </View>
                            )}

                            {task.completed && task.timeSpent > 0 && (
                                <View style={styles.cardTimerSection}>
                                    <Text style={[styles.timerDisplayText, { opacity: 0.6 }]}>
                                        ⏱️ {formatTimeSpent(task.timeSpent)}
                                    </Text>
                                </View>
                            )}

                            <TouchableOpacity onPress={() => openOptions(task)} style={{ paddingLeft: 8 }}>
                                <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </SwipeableTask>
                ))}

                {/* Past Pending Tasks Section */}
                {pastTasks.length > 0 && (
                    <>
                        <TouchableOpacity 
                            style={[styles.sectionHeaderContainer, { marginTop: 24 }]}
                            onPress={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setPastCollapsed(!pastCollapsed);
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons 
                                name={pastCollapsed ? "chevron-forward-outline" : "chevron-down-outline"} 
                                size={18} 
                                color={colors.text} 
                            />
                            <Text style={styles.sectionHeaderText}>Past Tasks</Text>
                            <Text style={styles.sectionHeaderCount}>{pastTasks.length}</Text>
                        </TouchableOpacity>

                        {!pastCollapsed && pastTasks.map(task => (
                            <SwipeableTask
                                key={task.id}
                                colors={colors}
                                onSwipeLeft={(reset) => handleSwipeDelete(task, reset)}
                            >
                                <View style={[styles.taskCard, task.timerRunning && styles.taskCardActive]}>
                                    <TouchableOpacity 
                                        style={[styles.checkbox, task.completed && styles.checkboxCompleted]}
                                        onPress={() => {
                                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                            toggleTaskCompletion(task.id);
                                        }}
                                    >
                                        {task.completed && <Ionicons name="checkmark" size={20} color="#FFF" />}
                                    </TouchableOpacity>
                                    
                                    <View style={styles.taskContent}>
                                        <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
                                            {task.title}
                                        </Text>
                                        <View style={styles.taskMeta}>
                                            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) + '20' }]}>
                                                <Text style={[styles.priorityText, { color: getPriorityColor(task.priority) }]}>
                                                    {task.priority}
                                                </Text>
                                            </View>
                                            <Text style={styles.categoryText}>{task.category}</Text>
                                            
                                            <View style={styles.pastDateTag}>
                                                <Ionicons name="calendar-outline" size={11} color={colors.error} />
                                                <Text style={styles.pastDateText}>{task.date}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Move to Today shortcut arrow */}
                                    {!task.completed && (
                                        <TouchableOpacity 
                                            style={styles.quickMoveBtn}
                                            onPress={() => {
                                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                                moveToToday(task.id);
                                            }}
                                        >
                                            <LinearGradient
                                                colors={['#EC4899', '#8B5CF6']}
                                                style={styles.quickMoveGradient}
                                            >
                                                <Ionicons name="arrow-up" size={16} color="#FFF" />
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    )}

                                    {task.timeSpent > 0 && (
                                        <View style={[styles.cardTimerSection, { marginRight: 6 }]}>
                                            <Text style={[styles.timerDisplayText, { opacity: 0.6 }]}>
                                                ⏱️ {formatTimeSpent(task.timeSpent)}
                                            </Text>
                                        </View>
                                    )}

                                    <TouchableOpacity onPress={() => openOptions(task)} style={{ paddingLeft: 8 }}>
                                        <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                            </SwipeableTask>
                        ))}
                    </>
                )}

                {/* Empty State */}
                {filteredTasks.length === 0 && (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="clipboard-outline" size={64} color={colors.textTertiary} />
                        <Text style={styles.emptyText}>No tasks found</Text>
                        <Text style={styles.emptySubtext}>Try adjusting your filters or search query!</Text>
                    </View>
                )}
                <View style={{ height: 160 }} />
            </ScrollView>

            {/* Add Task FAB */}
            <TouchableOpacity style={styles.fab} onPress={openAddModal}>
                <LinearGradient
                    colors={['#667EEA', '#764BA2']}
                    style={styles.fabGradient}
                >
                    <Ionicons name="add" size={28} color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>

            {/* Options Action Sheet Modal */}
            <Modal
                visible={optionsModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setOptionsModalVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setOptionsModalVisible(false)}
                >
                    <View style={styles.actionSheetContainer}>
                        <View style={styles.sheetGrabber} />
                        <Text style={styles.actionSheetTitle}>Manage Task</Text>
                        {selectedTask && (
                            <View style={styles.actionSheetContent}>
                                <Text style={styles.selectedTaskTitle} numberOfLines={1}>
                                    {selectedTask.title}
                                </Text>
                                
                                <TouchableOpacity 
                                    style={styles.actionSheetOption}
                                    onPress={() => {
                                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                        toggleTaskCompletion(selectedTask.id);
                                        setOptionsModalVisible(false);
                                    }}
                                >
                                    <View style={[styles.actionIconContainer, { backgroundColor: colors.primary + '15' }]}>
                                        <Ionicons 
                                            name={selectedTask.completed ? "ellipse-outline" : "checkmark-circle-outline"} 
                                            size={22} 
                                            color={colors.primary} 
                                        />
                                    </View>
                                    <Text style={styles.actionSheetOptionText}>
                                        {selectedTask.completed ? 'Mark as Active' : 'Mark as Completed'}
                                    </Text>
                                </TouchableOpacity>

                                {/* Carry over individual past task option */}
                                {selectedTask.date < todayStr && !selectedTask.completed && (
                                    <TouchableOpacity 
                                        style={styles.actionSheetOption}
                                        onPress={() => {
                                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                            moveToToday(selectedTask.id);
                                            setOptionsModalVisible(false);
                                        }}
                                    >
                                        <View style={[styles.actionIconContainer, { backgroundColor: colors.success + '15' }]}>
                                            <Ionicons name="arrow-up-circle-outline" size={22} color={colors.success} />
                                        </View>
                                        <Text style={styles.actionSheetOptionText}>Move to Today</Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity 
                                    style={styles.actionSheetOption}
                                    onPress={() => openEditModal(selectedTask)}
                                >
                                    <View style={[styles.actionIconContainer, { backgroundColor: colors.info + '15' }]}>
                                        <Ionicons name="create-outline" size={22} color={colors.info} />
                                    </View>
                                    <Text style={styles.actionSheetOptionText}>Edit Details</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={[styles.actionSheetOption, styles.deleteOption]}
                                    onPress={() => handleDeleteTask(selectedTask)}
                                >
                                    <View style={[styles.actionIconContainer, { backgroundColor: colors.error + '15' }]}>
                                        <Ionicons name="trash-outline" size={22} color={colors.error} />
                                    </View>
                                    <Text style={[styles.actionSheetOptionText, { color: colors.error }]}>Delete Task</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Add / Edit Task Modal */}
            <Modal
                visible={addEditModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setAddEditModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <TouchableOpacity 
                        style={styles.modalOverlay} 
                        activeOpacity={1} 
                        onPress={() => setAddEditModalVisible(false)}
                    >
                        <TouchableOpacity 
                            activeOpacity={1} 
                            style={styles.formContainer}
                        >
                            <View style={styles.sheetGrabber} />
                            
                            <View style={styles.formHeader}>
                                <Text style={styles.formTitle}>
                                    {isEditing ? 'Edit Task' : 'Add New Task'}
                                </Text>
                                <TouchableOpacity onPress={() => setAddEditModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                                {/* Task Title Input */}
                                <Text style={styles.fieldLabel}>What is to be done?</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Enter task title..."
                                    placeholderTextColor={colors.textTertiary}
                                    value={taskTitle}
                                    onChangeText={setTaskTitle}
                                    autoFocus={true}
                                />

                                {/* Category Selector */}
                                <Text style={styles.fieldLabel}>Category</Text>
                                <View style={styles.categoryRow}>
                                    {CATEGORIES.map(cat => (
                                        <TouchableOpacity
                                            key={cat}
                                            onPress={() => setTaskCategory(cat)}
                                            style={[
                                                styles.categoryChip,
                                                taskCategory === cat && styles.categoryChipActive
                                            ]}
                                        >
                                            <Text 
                                                style={[
                                                    styles.categoryChipText,
                                                    taskCategory === cat && styles.categoryChipTextActive
                                                ]}
                                            >
                                                {cat}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Priority Selector */}
                                <Text style={styles.fieldLabel}>Priority</Text>
                                <View style={styles.priorityRow}>
                                    {(['low', 'medium', 'high'] as const).map(prio => (
                                        <TouchableOpacity
                                            key={prio}
                                            onPress={() => setTaskPriority(prio)}
                                            style={[
                                                styles.priorityBtn,
                                                taskPriority === prio && {
                                                    backgroundColor: getPriorityColor(prio) + '20',
                                                    borderColor: getPriorityColor(prio),
                                                }
                                            ]}
                                        >
                                            <View style={[
                                                styles.priorityDot, 
                                                { backgroundColor: getPriorityColor(prio) }
                                            ]} />
                                            <Text 
                                                style={[
                                                    styles.priorityBtnText,
                                                    taskPriority === prio && {
                                                        color: getPriorityColor(prio),
                                                        fontWeight: 'bold',
                                                    }
                                                ]}
                                            >
                                                {prio.charAt(0).toUpperCase() + prio.slice(1)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Scheduled Time Field */}
                                <Text style={styles.fieldLabel}>Scheduled Time</Text>
                                <View style={styles.presetTimeRow}>
                                    {PRESET_TIMES.map(time => (
                                        <TouchableOpacity
                                            key={time}
                                            onPress={() => setTaskTime(time)}
                                            style={[
                                                styles.presetTimeBtn,
                                                taskTime === time && styles.presetTimeBtnActive
                                            ]}
                                        >
                                            <Text style={[
                                                styles.presetTimeBtnText,
                                                taskTime === time && styles.presetTimeBtnTextActive
                                            ]}>
                                                {time.split(' ')[0]}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Or enter custom time (e.g., 10:30 AM)..."
                                    placeholderTextColor={colors.textTertiary}
                                    value={taskTime}
                                    onChangeText={setTaskTime}
                                />

                                {/* Save Button */}
                                <TouchableOpacity 
                                    onPress={handleSaveTask}
                                    style={styles.saveBtn}
                                >
                                    <LinearGradient
                                        colors={['#667EEA', '#764BA2']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.saveBtnGradient}
                                    >
                                        <Text style={styles.saveBtnText}>
                                            {isEditing ? 'Save Changes' : 'Create Task'}
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </ScrollView>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const createStyles = (colors: typeof Colors.light) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 24,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#FFF',
        opacity: 0.9,
        marginTop: 4,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 12,
    },
    filterTab: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.surface,
    },
    filterTabActive: {
        backgroundColor: colors.primary,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    filterTextActive: {
        color: '#FFF',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        marginHorizontal: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 12,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: colors.text,
    },
    scrollView: {
        flex: 1,
    },
    carryOverBanner: {
        marginHorizontal: 20,
        marginTop: 4,
        marginBottom: 20,
        padding: 16,
        borderRadius: 18,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    carryOverHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    carryOverText: {
        flex: 1,
        fontSize: 13.5,
        fontWeight: '600',
        color: '#FFF',
        lineHeight: 18,
    },
    carryOverActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 4,
    },
    carryOverButton: {
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
    },
    carryOverButtonText: {
        color: '#8B5CF6',
        fontSize: 12.5,
        fontWeight: 'bold',
    },
    carryOverButtonSecondary: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    carryOverButtonTextSecondary: {
        color: '#FFF',
        fontSize: 12.5,
        fontWeight: '600',
    },
    sectionHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginTop: 12,
        marginBottom: 12,
        gap: 8,
    },
    sectionHeaderText: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    sectionHeaderCount: {
        fontSize: 11,
        fontWeight: '600',
        backgroundColor: colors.surfaceSecondary,
        color: colors.textSecondary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        overflow: 'hidden',
    },
    taskCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    taskCardActive: {
        borderColor: colors.primary,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.primary,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxCompleted: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    taskContent: {
        flex: 1,
    },
    taskTitle: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.text,
        marginBottom: 6,
    },
    taskTitleCompleted: {
        textDecorationLine: 'line-through',
        color: colors.textSecondary,
    },
    taskMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    priorityText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    categoryText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    scheduledTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.surfaceSecondary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    scheduledTimeText: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    pastDateTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.errorLight,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    pastDateText: {
        fontSize: 11,
        color: colors.error,
        fontWeight: '600',
    },
    cardTimerSection: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        gap: 2,
    },
    timerButton: {
        padding: 2,
    },
    timerDisplayText: {
        fontSize: 11,
        fontWeight: '600',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        color: colors.textSecondary,
    },
    timerDisplayTextRunning: {
        color: colors.error,
        fontWeight: 'bold',
    },
    quickMoveBtn: {
        paddingHorizontal: 6,
        justifyContent: 'center',
    },
    quickMoveGradient: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 8,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 130,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    fabGradient: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    actionSheetContainer: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    sheetGrabber: {
        width: 40,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: colors.border,
        alignSelf: 'center',
        marginBottom: 16,
    },
    actionSheetTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
        textAlign: 'center',
    },
    selectedTaskTitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 20,
        textAlign: 'center',
        paddingHorizontal: 16,
    },
    actionSheetContent: {
        gap: 12,
    },
    actionSheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceSecondary,
        padding: 14,
        borderRadius: 12,
        gap: 12,
    },
    actionIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionSheetOptionText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    deleteOption: {
        // Red subtle styling for deletion is handled inline or using text color
    },
    formContainer: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        maxHeight: '80%',
    },
    formHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    formTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
        marginTop: 16,
    },
    formInput: {
        fontSize: 15,
        color: colors.text,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.primary,
        paddingVertical: 8,
        marginBottom: 10,
    },
    categoryRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10,
    },
    categoryChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    categoryChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    categoryChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    categoryChipTextActive: {
        color: '#FFF',
    },
    priorityRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    priorityBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 6,
    },
    priorityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    priorityBtnText: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    presetTimeRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    presetTimeBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: colors.surfaceSecondary,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    presetTimeBtnActive: {
        backgroundColor: colors.primary + '15',
        borderColor: colors.primary,
    },
    presetTimeBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    presetTimeBtnTextActive: {
        color: colors.primary,
        fontWeight: 'bold',
    },
    saveBtn: {
        marginTop: 24,
        borderRadius: 16,
        overflow: 'hidden',
    },
    saveBtnGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
