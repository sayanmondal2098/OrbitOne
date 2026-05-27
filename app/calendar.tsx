import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Text, TouchableOpacity, Modal, Linking, Platform, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useTheme } from '../context/ThemeContext';
import { useTasks, Task, getLocalDateString } from '../context/TasksContext';
import { getGoogleCalendarUrl, getAppleCalendarUrl } from '../services/calendarSync';
import * as Calendar from 'expo-calendar';

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
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { tasks, toggleTaskCompletion } = useTasks();
    
    const weekDates = React.useMemo(() => getWeekDates(), []);
    const [selectedDateStr, setSelectedDateStr] = useState(getLocalDateString(0));

    // Native Calendar state
    const [deviceEvents, setDeviceEvents] = useState<any[]>([]);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [calendarCount, setCalendarCount] = useState<number>(0);
    const [detectedCalendars, setDetectedCalendars] = useState<any[]>([]);
    const [diagnosticsModalVisible, setDiagnosticsModalVisible] = useState(false);
    const [syncIsRefreshing, setSyncIsRefreshing] = useState(false);

    // Options Modal
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

    const styles = React.useMemo(() => createStyles(colors), [colors]);

    const fetchDeviceEvents = async () => {
        if (Platform.OS === 'web') {
            setCalendarCount(0);
            setDetectedCalendars([]);
            return;
        }
        try {
            const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
            setCalendarCount(calendars.length);
            
            const formattedCals = calendars.map(cal => ({
                id: cal.id,
                title: cal.title || 'Untitled Calendar',
                sourceName: cal.source?.name || 'Local Device',
                sourceType: cal.source?.type || 'local',
                color: cal.color || '#6366F1',
            }));
            setDetectedCalendars(formattedCals);
            
            const calendarIds = calendars.map(cal => cal.id);
            if (calendarIds.length === 0) {
                setDeviceEvents([]);
                return;
            }
            
            const firstDay = new Date(weekDates[0].fullDate + 'T00:00:00');
            const lastDay = new Date(weekDates[6].fullDate + 'T23:59:59');
            
            const events = await Calendar.getEventsAsync(calendarIds, firstDay, lastDay);
            setDeviceEvents(events);
        } catch (error) {
            console.log('Error fetching device calendar events:', error);
            setDeviceEvents([]);
        }
    };

    const checkAndRequestPermissions = async () => {
        if (Platform.OS === 'web') {
            setHasPermission(false);
            return;
        }
        try {
            const { status } = await Calendar.requestCalendarPermissionsAsync();
            if (status === 'granted') {
                setHasPermission(true);
                await fetchDeviceEvents();
            } else {
                setHasPermission(false);
            }
        } catch (error) {
            console.log('Error requesting calendar permissions:', error);
            setHasPermission(false);
        }
    };

    // Request calendar permissions and fetch events on mount
    useEffect(() => {
        checkAndRequestPermissions();
    }, []);

    const handleManualRefresh = async () => {
        setSyncIsRefreshing(true);
        await fetchDeviceEvents();
        setTimeout(() => {
            setSyncIsRefreshing(false);
            Alert.alert('Sync Successful', 'Calendar schedule timeline has been updated with current device data.');
        }, 800);
    };

    const getSyncStatusColor = () => {
        if (Platform.OS === 'web') return '#F59E0B'; // Amber
        if (hasPermission === false) return '#EF4444'; // Red
        if (hasPermission === true && calendarCount === 0) return '#F59E0B'; // Amber
        if (hasPermission === true) return '#10B981'; // Green
        return '#9CA3AF'; // Gray
    };

    const getSyncStatusText = () => {
        if (Platform.OS === 'web') return 'Web Demo (Local)';
        if (hasPermission === false) return 'Permission Required';
        if (hasPermission === true && calendarCount === 0) return 'No Calendars Found';
        if (hasPermission === true) return `Synced (${calendarCount} Feeds)`;
        return 'Checking Sync...';
    };

    // Map external device events into standard list card structure
    const mappedDeviceEvents = React.useMemo(() => {
        return deviceEvents.map(evt => {
            const startDateObj = new Date(evt.startDate);
            const yyyy = startDateObj.getFullYear();
            const mm = String(startDateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(startDateObj.getDate()).padStart(2, '0');
            const eventDate = `${yyyy}-${mm}-${dd}`;
            
            let timeStr = 'All Day';
            if (!evt.allDay) {
                let h = startDateObj.getHours();
                const m = String(startDateObj.getMinutes()).padStart(2, '0');
                const meridian = h >= 12 ? 'PM' : 'AM';
                h = h % 12;
                h = h ? h : 12;
                timeStr = `${String(h).padStart(2, '0')}:${m} ${meridian}`;
            }
            
            return {
                id: `device-${evt.id}`,
                title: evt.title,
                priority: 'low',
                completed: false,
                category: 'Device Calendar',
                date: eventDate,
                scheduledTime: timeStr,
                isDeviceEvent: true,
                notes: evt.notes || '',
                location: evt.location || ''
            };
        });
    }, [deviceEvents]);

    // Combine local tasks and mapped device events
    const todaysTasks = tasks.filter(t => t.date === selectedDateStr);
    const todaysDeviceEvents = mappedDeviceEvents.filter(e => e.date === selectedDateStr);
    const combinedEvents = [...todaysTasks, ...todaysDeviceEvents];
    
    const sortedEvents = React.useMemo(() => {
        return [...combinedEvents].sort((a, b) => {
            const timeA = a.scheduledTime || '09:00 AM';
            const timeB = b.scheduledTime || '09:00 AM';
            
            const getMinutes = (tStr: string) => {
                if (tStr === 'All Day') return 0; // All Day items at top
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
    }, [combinedEvents]);

    const getPriorityColor = (priority: string, isDeviceEvent?: boolean) => {
        if (isDeviceEvent) return '#6366F1'; // Synced events are stylized in Indigo
        switch (priority) {
            case 'high': return colors.error;
            case 'medium': return colors.warning;
            case 'low': return colors.success;
            default: return colors.primary;
        }
    };

    const handleEventPress = (event: any) => {
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
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={['#F093FB', '#F5576C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 16 }]}
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
                    <View style={{ flex: 1 }}>
                        <Text style={styles.eventsTitle}>
                            {selectedDateStr === getLocalDateString(0) ? "Today's Schedule" : "Scheduled Events"}
                        </Text>
                        <TouchableOpacity 
                            onPress={() => setDiagnosticsModalVisible(true)}
                            style={styles.syncStatusPill}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.syncStatusDot, { backgroundColor: getSyncStatusColor() }]} />
                            <Text style={styles.syncStatusText}>{getSyncStatusText()}</Text>
                            <Ionicons name="information-circle-outline" size={13} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.eventsCount}>{sortedEvents.length} events</Text>
                </View>

                {sortedEvents.length > 0 ? (
                    <View style={styles.timeline}>
                        {sortedEvents.map((event, index) => (
                            <View key={event.id} style={styles.eventItem}>
                                <View style={styles.timelineMarker}>
                                    <View style={[styles.eventDot, { backgroundColor: getPriorityColor(event.priority, event.isDeviceEvent) }]} />
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
                                        
                                        {/* Status Tags */}
                                        {event.completed && (
                                            <View style={styles.completedTag}>
                                                <Ionicons name="checkmark-done" size={12} color={colors.success} />
                                                <Text style={styles.completedTagText}>Completed</Text>
                                            </View>
                                        )}
                                        {event.isDeviceEvent && (
                                            <View style={styles.deviceTag}>
                                                <Ionicons name="sync-circle-outline" size={12} color="#6366F1" />
                                                <Text style={styles.deviceTagText}>Synced Event</Text>
                                            </View>
                                        )}
                                    </View>
                                    
                                    <LinearGradient
                                        colors={[
                                            getPriorityColor(event.priority, event.isDeviceEvent) + '15', 
                                            getPriorityColor(event.priority, event.isDeviceEvent) + '08'
                                        ]}
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
                                            name={event.isDeviceEvent ? "logo-google" : "calendar-outline"} 
                                            size={20} 
                                            color={getPriorityColor(event.priority, event.isDeviceEvent)} 
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
                        <Text style={styles.emptySubtext}>
                            You have a free day! Synced device events (Google/Apple) and local tasks will populate here automatically.
                        </Text>
                        <TouchableOpacity 
                            onPress={() => setDiagnosticsModalVisible(true)}
                            style={styles.emptyDiagnosticsBtn}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="sync-outline" size={16} color={colors.primary} />
                            <Text style={styles.emptyDiagnosticsText}>Troubleshoot Calendar Sync</Text>
                        </TouchableOpacity>
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
                        
                        {selectedEvent && (
                            <View style={styles.actionSheetContent}>
                                <Text style={styles.actionSheetTitle}>
                                    {selectedEvent.isDeviceEvent ? 'Synced Device Event' : 'Calendar Integration'}
                                </Text>
                                <Text style={styles.selectedTaskTitle} numberOfLines={1}>
                                    {selectedEvent.title}
                                </Text>
                                
                                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 250, paddingHorizontal: 4 }}>
                                    {/* Location details */}
                                    {selectedEvent.location ? (
                                        <View style={styles.detailItem}>
                                            <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
                                            <Text style={styles.detailValueText}>{selectedEvent.location}</Text>
                                        </View>
                                    ) : null}

                                    {/* Notes details */}
                                    {selectedEvent.notes ? (
                                        <View style={styles.detailItem}>
                                            <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
                                            <Text style={styles.detailValueText}>{selectedEvent.notes}</Text>
                                        </View>
                                    ) : null}

                                    <View style={styles.detailItem}>
                                        <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                                        <Text style={styles.detailValueText}>
                                            {selectedEvent.scheduledTime || 'No Time Set'} • {selectedEvent.date}
                                        </Text>
                                    </View>
                                </ScrollView>

                                <View style={styles.separator} />

                                {/* Interactive items based on context */}
                                {!selectedEvent.isDeviceEvent ? (
                                    <>
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
                                    </>
                                ) : (
                                    <View style={styles.readOnlyPrompt}>
                                        <Ionicons name="information-circle-outline" size={20} color="#6366F1" />
                                        <Text style={styles.readOnlyText}>
                                            This event is read directly from your device's native calendar and is read-only.
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Diagnostics Modal */}
            <Modal
                visible={diagnosticsModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setDiagnosticsModalVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setDiagnosticsModalVisible(false)}
                >
                    <View style={styles.actionSheetContainer}>
                        <View style={styles.sheetGrabber} />
                        
                        <View style={styles.actionSheetContent}>
                            <Text style={styles.actionSheetTitle}>Sync Diagnostics</Text>
                            <Text style={styles.selectedTaskTitle}>
                                Real-time Google & Apple Calendar integration status
                            </Text>

                            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300, paddingHorizontal: 4 }}>
                                {/* Sync Status Card */}
                                <View style={[styles.diagnosticCard, { borderLeftColor: getSyncStatusColor() }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                        <View style={[styles.syncStatusDot, { backgroundColor: getSyncStatusColor(), width: 10, height: 10, borderRadius: 5 }]} />
                                        <Text style={styles.diagnosticCardTitle}>
                                            Connection: {Platform.OS === 'web' ? 'Web Mode' : hasPermission ? 'Connected' : 'Offline'}
                                        </Text>
                                    </View>
                                    <Text style={styles.diagnosticCardDesc}>
                                        {Platform.OS === 'web' && "Native calendars cannot be accessed in browser mode. Download the OrbitOne Android or iOS app to enable real-time reading from your device accounts!"}
                                        {Platform.OS !== 'web' && hasPermission === false && "Calendar permissions are currently disabled. Grant permission to let OrbitOne read synced calendars like Google Calendar and Apple iCloud."}
                                        {Platform.OS !== 'web' && hasPermission === true && calendarCount === 0 && "Permissions are active, but zero calendars were detected on your device. Please verify your Google or iCloud account is signed in and calendar syncing is enabled."}
                                        {Platform.OS !== 'web' && hasPermission === true && calendarCount > 0 && `Successfully connected! OrbitOne is dynamically scanning ${calendarCount} native calendars for events scheduled this week.`}
                                    </Text>
                                </View>

                                {/* Detailed Lists / Help Steps */}
                                {Platform.OS === 'web' && (
                                    <View style={styles.helpBox}>
                                        <Ionicons name="bulb-outline" size={20} color={colors.primary} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.helpBoxTitle}>Google Calendar Export</Text>
                                            <Text style={styles.helpBoxText}>
                                                You can still sync individual local tasks to Google and Apple Calendar on the Web! Simply tap any task card on the Tasks screen and choose "Sync with Google".
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {Platform.OS !== 'web' && hasPermission === false && (
                                    <View style={styles.helpBox}>
                                        <Ionicons name="settings-outline" size={20} color={colors.error} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.helpBoxTitle}>How to enable access</Text>
                                            <Text style={styles.helpBoxText}>
                                                1. Go to your device's System Settings.{'\n'}
                                                2. Find "OrbitOne" in your app list.{'\n'}
                                                3. Toggle Calendar permissions to "Allow" or "Full Access".
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {Platform.OS !== 'web' && hasPermission === true && calendarCount === 0 && (
                                    <View style={styles.helpBox}>
                                        <Ionicons name="help-circle-outline" size={20} color={colors.warning} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.helpBoxTitle}>Simulator Setup</Text>
                                            <Text style={styles.helpBoxText}>
                                                On emulators/simulators, native calendar databases start completely empty. Add events manually in the system's "Calendar" app, or sign into a real Google/Apple account in Settings.
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {Platform.OS !== 'web' && hasPermission === true && calendarCount > 0 && (
                                    <View style={{ marginTop: 12 }}>
                                        <Text style={styles.sectionSubTitle}>Active Calendar Feeds</Text>
                                        {detectedCalendars.map(cal => (
                                            <View key={cal.id} style={styles.calendarFeedItem}>
                                                <View style={[styles.calendarFeedColor, { backgroundColor: cal.color }]} />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.calendarFeedTitle}>{cal.title}</Text>
                                                    <Text style={styles.calendarFeedSource}>{cal.sourceName} • {cal.sourceType}</Text>
                                                </View>
                                                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </ScrollView>

                            <View style={styles.separator} />

                            {/* Modal Actions */}
                            <View style={{ gap: 10 }}>
                                {Platform.OS !== 'web' && hasPermission === false && (
                                    <TouchableOpacity 
                                        style={styles.actionSheetOption}
                                        onPress={checkAndRequestPermissions}
                                    >
                                        <View style={[styles.actionIconContainer, { backgroundColor: colors.primary + '15' }]}>
                                            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                                        </View>
                                        <Text style={styles.actionSheetOptionText}>Request Calendar Access</Text>
                                    </TouchableOpacity>
                                )}

                                {Platform.OS !== 'web' && hasPermission === false && (
                                    <TouchableOpacity 
                                        style={styles.actionSheetOption}
                                        onPress={() => {
                                            Linking.openSettings();
                                            setDiagnosticsModalVisible(false);
                                        }}
                                    >
                                        <View style={[styles.actionIconContainer, { backgroundColor: colors.textSecondary + '10' }]}>
                                            <Ionicons name="open-outline" size={20} color={colors.text} />
                                        </View>
                                        <Text style={styles.actionSheetOptionText}>Open Device Settings</Text>
                                    </TouchableOpacity>
                                )}

                                {Platform.OS !== 'web' && hasPermission === true && (
                                    <TouchableOpacity 
                                        style={styles.actionSheetOption}
                                        onPress={handleManualRefresh}
                                        disabled={syncIsRefreshing}
                                    >
                                        <View style={[styles.actionIconContainer, { backgroundColor: colors.success + '15' }]}>
                                            <Ionicons 
                                                name={syncIsRefreshing ? "sync" : "refresh-outline"} 
                                                size={20} 
                                                color={colors.success} 
                                            />
                                        </View>
                                        <Text style={styles.actionSheetOptionText}>
                                            {syncIsRefreshing ? 'Syncing...' : 'Sync & Refresh Now'}
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity 
                                    style={[styles.actionSheetOption, { backgroundColor: colors.surfaceSecondary }]}
                                    onPress={() => setDiagnosticsModalVisible(false)}
                                >
                                    <View style={[styles.actionIconContainer, { backgroundColor: colors.textSecondary + '10' }]}>
                                        <Ionicons name="close-outline" size={20} color={colors.textSecondary} />
                                    </View>
                                    <Text style={styles.actionSheetOptionText}>Close</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
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
    deviceTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: '#6366F115',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginLeft: 6,
    },
    deviceTagText: {
        fontSize: 11,
        color: '#6366F1',
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
        marginBottom: 16,
        textAlign: 'center',
        paddingHorizontal: 16,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 6,
    },
    detailValueText: {
        fontSize: 14,
        color: colors.text,
        flex: 1,
    },
    separator: {
        height: 1.5,
        backgroundColor: colors.border,
        marginVertical: 14,
    },
    readOnlyPrompt: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6366F110',
        padding: 12,
        borderRadius: 12,
        gap: 10,
        marginTop: 4,
    },
    readOnlyText: {
        fontSize: 13,
        color: '#6366F1',
        fontWeight: '500',
        flex: 1,
        lineHeight: 18,
    },
    actionSheetContent: {
        gap: 6,
    },
    actionSheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceSecondary,
        padding: 14,
        borderRadius: 12,
        gap: 12,
        marginBottom: 10,
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
    syncStatusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: colors.surfaceSecondary,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        marginTop: 6,
        gap: 6,
        borderWidth: 1,
        borderColor: colors.border,
    },
    syncStatusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    syncStatusText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    emptyDiagnosticsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 20,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: colors.primary + '10',
        borderWidth: 1,
        borderColor: colors.primary + '30',
    },
    emptyDiagnosticsText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primary,
    },
    diagnosticCard: {
        backgroundColor: colors.surfaceSecondary,
        padding: 16,
        borderRadius: 16,
        borderLeftWidth: 4,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    diagnosticCardTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: colors.text,
    },
    diagnosticCardDesc: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    helpBox: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: colors.surfaceSecondary + '70',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 12,
        alignItems: 'flex-start',
    },
    helpBoxTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    helpBoxText: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 16,
    },
    sectionSubTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    calendarFeedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.surfaceSecondary,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    calendarFeedColor: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    calendarFeedTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    calendarFeedSource: {
        fontSize: 12,
        color: colors.textSecondary,
    },
});
