import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Text, TouchableOpacity, Modal, Linking, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useTheme } from '../context/ThemeContext';
import { useTasks, Task, getLocalDateString } from '../context/TasksContext';
import { getGoogleCalendarUrl, getAppleCalendarUrl } from '../services/calendarSync';

// Helper to calculate week days (Monday - Sunday) based on current calendar week
const getWeekDates = () => {
    const dates = [];
    const today = new Date();
    const day = today.getDay();
    // Monday-based offset (if Sunday day=0 offset by -6, else offset by 1 - day)
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
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

// Formats YYYY-MM-DD to "Month Day, Year" for visual beauty
const formatMonthYear = (dateStr: string) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
        const year = parts[0];
        const monthIndex = parseInt(parts[1]) - 1;
        return `${months[monthIndex]} ${year}`;
    }
    return 'Calendar';
};

export default function CalendarScreen() {
    const { colors } = useTheme();
    const { tasks, toggleTaskCompletion } = useTasks();
    
    const weekDates = React.useMemo(() => getWeekDates(), []);
    const [selectedDateStr, setSelectedDateStr] = useState(getLocalDateString(0));

    // Options Modal
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Task | null>(null);

    const styles = React.useMemo(() => createStyles(colors), [colors]);

    // Filter and sort events for selected date
    const todaysEvents = tasks.filter(t => t.date === selectedDateStr);
    
    const sortedEvents = React.useMemo(() => {
        return [...todaysEvents].sort((a, b) => {
            const timeA = a.scheduledTime || '09:00 AM';
            const timeB = b.scheduledTime || '09:00 AM';
            
            const getMinutes = (tStr: string) => {
                const matches = tStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
                if (!matches) return 540; // Default to 9:00 AM
                let h = parseInt(matches[1]);
                const m = parseInt(matches[2]);
                const meridian = matches[3];
                if (meridian && meridian.toUpperCase() === 'PM' && h < 12) h += 12;
                if (meridian && meridian.toUpperCase() === 'AM' && h === 12) h = 0;
                return h * 60 + m;
            };
            return getMinutes(timeA) - getMinutes(timeB);
        });
    }, [todaysEvents]);

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return colors.error;
            case 'medium': return colors.warning;
            case 'low': return colors.success;
            default: return colors.primary;
        }
    };

    const handleEventPress = (event: Task) => {
        setSelectedEvent(event);
        setOptionsModalVisible(true);
    };

    const syncGoogle = () => {
        if (!selectedEvent) return;
        const url = getGoogleCalendarUrl(selectedEvent);
        Linking.openURL(url).catch(() => {
            Alert.alert('Sync Failed', 'Could not open Google Calendar integration link.');
        });
        setOptionsModalVisible(false);
    };

    const syncApple = () => {
        if (!selectedEvent) return;
        const url = getAppleCalendarUrl(selectedEvent);
        Linking.openURL(url).catch(() => {
            Alert.alert('Sync Failed', 'Could not open Apple Calendar integration link.');
        });
        setOptionsModalVisible(false);
    };

    const handleToggleComplete = () => {
        if (!selectedEvent) return;
        toggleTaskCompletion(selectedEvent.id);
        setOptionsModalVisible(false);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <LinearGradient
                colors={['#F093FB', '#F5576C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerTop}>
                    <Text style={styles.monthText}>{formatMonthYear(selectedDateStr)}</Text>
                </View>
                
                {/* Week Calendar Selector */}
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.weekScroll}
                >
                    {weekDates.map((dateObj) => (
                        <TouchableOpacity
                            key={dateObj.fullDate}
                            onPress={() => setSelectedDateStr(dateObj.fullDate)}
                            style={[
                                styles.dateItem,
                                selectedDateStr === dateObj.fullDate && styles.dateItemActive
                            ]}
                        >
                            <Text style={[
                                styles.dayText,
                                selectedDateStr === dateObj.fullDate && styles.dayTextActive
                            ]}>
                                {dateObj.dayName}
                            </Text>
                            <Text style={[
                                styles.dateText,
                                selectedDateStr === dateObj.fullDate && styles.dateTextActive
                            ]}>
                                {dateObj.dayNum}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </LinearGradient>

            {/* Events Timeline */}
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.eventsHeader}>
                    <Text style={styles.eventsTitle}>
                        {selectedDateStr === getLocalDateString(0) ? "Today's Schedule" : "Scheduled Events"}
                    </Text>
                    <Text style={styles.eventsCount}>{sortedEvents.length} events</Text>
                </View>

                {sortedEvents.length > 0 ? (
                    <View style={styles.timeline}>
                        {sortedEvents.map((event, index) => (
                            <View key={event.id} style={styles.eventItem}>
                                <View style={styles.timelineMarker}>
                                    <View style={[styles.eventDot, { backgroundColor: getPriorityColor(event.priority) }]} />
                                    {index < sortedEvents.length - 1 && <View style={styles.timelineLine} />}
                                </View>
                                <TouchableOpacity 
                                    style={styles.eventCard} 
                                    onPress={() => handleEventPress(event)}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.eventTime}>
                                        <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
                                        <Text style={styles.eventTimeText}>
                                            {event.scheduledTime || 'No Time Set'}
                                        </Text>
                                        {event.completed && (
                                            <View style={styles.completedTag}>
                                                <Ionicons name="checkmark-done" size={12} color={colors.success} />
                                                <Text style={styles.completedTagText}>Completed</Text>
                                            </View>
                                        )}
                                    </View>
                                    <LinearGradient
                                        colors={[getPriorityColor(event.priority) + '15', getPriorityColor(event.priority) + '08']}
                                        style={[
                                            styles.eventContent,
                                            event.completed && { opacity: 0.7 }
                                        ]}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={[
                                                styles.eventTitleText,
                                                event.completed && styles.eventTitleTextCompleted
                                            ]}>
                                                {event.title}
                                            </Text>
                                            <Text style={styles.eventType}>{event.category}</Text>
                                        </View>
                                        <Ionicons 
                                            name="calendar-outline" 
                                            size={20} 
                                            color={getPriorityColor(event.priority)} 
                                        />
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="calendar-clear-outline" size={64} color={colors.textTertiary} />
                        <Text style={styles.emptyText}>No events scheduled</Text>
                        <Text style={styles.emptySubtext}>You have a free day! Go ahead and add some tasks to fill your schedule.</Text>
                    </View>
                )}

                <View style={{ height: 140 }} />
            </ScrollView>

            {/* Sync Options Modal */}
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
                        <Text style={styles.actionSheetTitle}>Calendar Integration</Text>
                        {selectedEvent && (
                            <View style={styles.actionSheetContent}>
                                <Text style={styles.selectedTaskTitle} numberOfLines={1}>
                                    {selectedEvent.title}
                                </Text>
                                
                                <TouchableOpacity 
                                    style={styles.actionSheetOption}
                                    onPress={syncGoogle}
                                >
                                    <View style={[styles.actionIconContainer, { backgroundColor: '#4285F415' }]}>
                                        <Ionicons name="logo-google" size={20} color="#4285F4" />
                                    </View>
                                    <Text style={styles.actionSheetOptionText}>Sync with Google Calendar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.actionSheetOption}
                                    onPress={syncApple}
                                >
                                    <View style={[styles.actionIconContainer, { backgroundColor: '#00000010' }]}>
                                        <Ionicons name="logo-apple" size={20} color={colors.text} />
                                    </View>
                                    <Text style={styles.actionSheetOptionText}>Sync with Apple Calendar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.actionSheetOption}
                                    onPress={handleToggleComplete}
                                >
                                    <View style={[styles.actionIconContainer, { backgroundColor: colors.primary + '15' }]}>
                                        <Ionicons 
                                            name={selectedEvent.completed ? "ellipse-outline" : "checkmark-circle-outline"} 
                                            size={22} 
                                            color={colors.primary} 
                                        />
                                    </View>
                                    <Text style={styles.actionSheetOptionText}>
                                        {selectedEvent.completed ? 'Mark as Active' : 'Mark as Completed'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
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
        paddingBottom: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 16,
        marginBottom: 20,
    },
    monthText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    weekScroll: {
        gap: 12,
    },
    dateItem: {
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        minWidth: 60,
    },
    dateItemActive: {
        backgroundColor: '#FFF',
    },
    dayText: {
        fontSize: 12,
        color: '#FFF',
        marginBottom: 4,
    },
    dayTextActive: {
        color: colors.primary,
        fontWeight: '600',
    },
    dateText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    dateTextActive: {
        color: colors.primary,
    },
    scrollView: {
        flex: 1,
    },
    eventsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 16,
    },
    eventsTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
    },
    eventsCount: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    timeline: {
        paddingHorizontal: 20,
    },
    eventItem: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    timelineMarker: {
        alignItems: 'center',
        marginRight: 16,
        paddingTop: 4,
    },
    eventDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: colors.border,
        marginTop: 4,
    },
    eventCard: {
        flex: 1,
    },
    eventTime: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    eventTimeText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    completedTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: Colors.light.success + '15',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginLeft: 6,
    },
    completedTagText: {
        fontSize: 11,
        color: Colors.light.success,
        fontWeight: 'bold',
    },
    eventContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    eventTitleText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    eventTitleTextCompleted: {
        textDecorationLine: 'line-through',
        color: colors.textSecondary,
    },
    eventType: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
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
        lineHeight: 20,
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
});
