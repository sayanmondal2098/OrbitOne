import React, { useState, useEffect, useMemo } from 'react';
import { 
    StyleSheet, 
    View, 
    ScrollView, 
    Text, 
    TouchableOpacity, 
    Switch, 
    Modal, 
    FlatList, 
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';
import { AppMascot } from '../components/illustrations';
import { useLocation } from '../context/LocationContext';
import { useTheme } from '../context/ThemeContext';
import { useTasks } from '../context/TasksContext';
import { useHabits } from '../context/HabitsContext';
import { fetchWeather } from '../services/weatherService';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PRESET_MASCOTS = [
    { id: 'astro', name: 'Astro Explorer 🚀', desc: 'A bold navigator charting new milestones.', icon: 'rocket', color: '#3B82F6' },
    { id: 'orbit', name: 'Orbit Robot 🤖', desc: 'A helpful digital companion powered by logic.', icon: 'hardware-chip', color: '#8B5CF6' },
    { id: 'panda', name: 'Focus Panda 🐼', desc: 'A calm, peaceful zen master of deep work.', icon: 'leaf', color: '#10B981' },
    { id: 'tiger', name: 'Zen Tiger 🐯', desc: 'An energetic force compounding daily wins.', icon: 'flame', color: '#EC4899' }
];

const PRESET_LOCATIONS = [
    { name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
    { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
    { name: 'Delhi', lat: 28.7041, lon: 77.1025 },
    { name: 'Bangalore', lat: 12.9716, lon: 77.5946 },
    { name: 'Hyderabad', lat: 17.3850, lon: 78.4867 },
    { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
    { name: 'Pune', lat: 18.5204, lon: 73.8567 },
    { name: 'Jaipur', lat: 26.9124, lon: 75.7873 },
    { name: 'Chandigarh', lat: 30.7333, lon: 76.7794 },
    { name: 'Indore', lat: 22.7196, lon: 75.8577 },
    { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714 },
    { name: 'Goa', lat: 15.2993, lon: 73.8243 }
];

export default function ProfileScreen() {
    const insets = useSafeAreaInsets();
    const { locations, primaryLocation, addLocation, removeLocation, setPrimaryLocation, updateWeather } = useLocation();
    const { theme, colors, toggleTheme } = useTheme();
    const { tasks } = useTasks();
    const { habits } = useHabits();

    const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

    // Live synced statistics
    const completedTasksCount = tasks.filter(t => t.completed).length;
    const totalTasksCount = tasks.length;
    
    const activeHabitsCount = habits.length;
    const bestHabitStreak = useMemo(() => {
        if (habits.length === 0) return 0;
        return Math.max(...habits.map(h => h.maxStreak));
    }, [habits]);

    // Gamified Experience & Levels calculation
    const totalCompletions = useMemo(() => {
        const tasksCompleted = tasks.filter(t => t.completed).length;
        const habitsCompleted = habits.reduce((acc, h) => {
            const completedDays = Object.keys(h.history).filter(k => h.history[k]).length;
            return acc + completedDays;
        }, 0);
        return tasksCompleted + habitsCompleted;
    }, [tasks, habits]);

    const userLevel = useMemo(() => {
        return Math.floor(totalCompletions / 8) + 1;
    }, [totalCompletions]);

    const xpProgress = useMemo(() => {
        return (totalCompletions % 8) / 8;
    }, [totalCompletions]);

    const getLevelTitle = (level: number) => {
        if (level <= 1) return 'Focus Initiate 🌱';
        if (level <= 2) return 'Productivity Squire 🛡️';
        if (level <= 3) return 'Streak Knight ⚔️';
        if (level <= 4) return 'Mindfulness Sage 🔮';
        return 'Orbit Grandmaster 👑';
    };

    // User Profile persistent states
    const [profileName, setProfileName] = useState('John Doe');
    const [profileEmail, setProfileEmail] = useState('john.doe@example.com');
    const [profileBio, setProfileBio] = useState('Stay focused. Compound daily wins. 🚀');
    const [profileMascot, setProfileMascot] = useState('astro'); // 'astro' | 'orbit' | 'panda' | 'tiger'

    // Modal Visibility States
    const [showLocationsModal, setShowLocationsModal] = useState(false);
    const [showMascotModal, setShowMascotModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    // Edit Form local states
    const [tempName, setTempName] = useState('');
    const [tempEmail, setTempEmail] = useState('');
    const [tempBio, setTempBio] = useState('');

    // Load persistent profile on mount
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const name = await AsyncStorage.getItem('orbitone_profile_name');
                const email = await AsyncStorage.getItem('orbitone_profile_email');
                const bio = await AsyncStorage.getItem('orbitone_profile_bio');
                const mascot = await AsyncStorage.getItem('orbitone_profile_mascot');
                if (name) setProfileName(name);
                if (email) setProfileEmail(email);
                if (bio) setProfileBio(bio);
                if (mascot) setProfileMascot(mascot);
            } catch (e) {
                console.error('Error loading profile storage:', e);
            }
        };
        loadProfile();
    }, []);

    const handleSaveProfileDetails = async () => {
        if (!tempName.trim()) {
            Alert.alert('Required Field', 'Please enter your name.');
            return;
        }
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setProfileName(tempName.trim());
        setProfileEmail(tempEmail.trim() || 'user@example.com');
        setProfileBio(tempBio.trim() || 'My journey of daily compounding wins.');
        setShowEditModal(false);

        try {
            await AsyncStorage.setItem('orbitone_profile_name', tempName.trim());
            await AsyncStorage.setItem('orbitone_profile_email', tempEmail.trim() || 'user@example.com');
            await AsyncStorage.setItem('orbitone_profile_bio', tempBio.trim() || 'My journey of daily compounding wins.');
        } catch (e) {
            console.error('Error writing profile details:', e);
        }
    };

    const handleSelectMascot = async (mascotId: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setProfileMascot(mascotId);
        setShowMascotModal(false);

        try {
            await AsyncStorage.setItem('orbitone_profile_mascot', mascotId);
        } catch (e) {
            console.error('Error writing profile mascot:', e);
        }
    };

    const openEditModal = () => {
        setTempName(profileName);
        setTempEmail(profileEmail);
        setTempBio(profileBio);
        setShowEditModal(true);
    };

    const getMascotDetails = (id: string) => {
        return PRESET_MASCOTS.find(m => m.id === id) || PRESET_MASCOTS[0];
    };

    const activeMascot = getMascotDetails(profileMascot);

    const filteredPresets = PRESET_LOCATIONS.filter(loc => 
      !locations.some(l => l.name.toLowerCase() === loc.name.toLowerCase()) &&
      loc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddLocation = async (location: any) => {
      const id = location.name.toLowerCase().replace(/\s+/g, '-');
      const newLocation = {
        id,
        name: location.name,
        latitude: location.lat,
        longitude: location.lon,
        isPrimary: false,
      };
      
      addLocation(newLocation);
      
      try {
        const weather = await fetchWeather(location.lat, location.lon, id);
        updateWeather(id, weather);
      } catch (error) {
        console.error('Error fetching weather on add:', error);
      }
    };

    const handleRemoveLocation = (locationId: string) => {
      Alert.alert(
        'Remove Location',
        'Are you sure you want to remove this location from your weather panel?',
        [
          { text: 'Cancel', onPress: () => {} },
          {
            text: 'Remove',
            onPress: () => removeLocation(locationId),
            style: 'destructive',
          },
        ]
      );
    };

    const menuItems = [
        {
            section: 'Account',
            items: [
                { icon: 'create-outline', label: 'Edit Profile Bio', color: '#6366F1', onPress: openEditModal },
                { icon: 'shield-checkmark-outline', label: 'Privacy & Security', color: '#14B8A6', onPress: () => Alert.alert('Secure Cloud', 'Your logs and data remain 100% locally sandbox encrypted on this device.') },
            ]
        },
        {
            section: 'Preferences',
            items: [
                { icon: 'notifications-outline', label: 'Push Notifications', color: '#F59E0B', hasSwitch: true, value: notificationsEnabled, onToggle: setNotificationsEnabled },
                { icon: 'moon-outline', label: 'Dark Space Theme', color: '#8B5CF6', hasSwitch: true, value: theme === 'dark', onToggle: toggleTheme },
            ]
        },
        {
            section: 'Support & About',
            items: [
                { icon: 'help-circle-outline', label: 'Help Center & Tutorials', color: '#3B82F6', onPress: () => Alert.alert('Help Center', 'OrbitOne coordinates tasks, habits, news, and live weather. Swipe items to discover native shortcut actions!') },
                { icon: 'star-outline', label: 'Rate OrbitOne', color: '#F59E0B', onPress: () => Alert.alert('App Store Rate', 'Rating OrbitOne coordinates direct developers feedback. Thank you for your support!') },
            ]
        },
    ];

    return (
        <View style={styles.container}>
            {/* Immersive Profile Header Gradient */}
            <LinearGradient
                colors={['#8B5CF6', '#EC4899', '#F97316']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 20 }]}
            >
                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <TouchableOpacity 
                        style={styles.avatarLargeContainer}
                        onPress={() => setShowMascotModal(true)}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[activeMascot.color, activeMascot.color + '80']}
                            style={styles.avatarLarge}
                        >
                            <Ionicons name={activeMascot.icon as any} size={44} color="#FFF" />
                        </LinearGradient>
                        {/* Interactive Edit Mascot Badge */}
                        <View style={[styles.avatarEditBadge, { backgroundColor: activeMascot.color }]}>
                            <Ionicons name="sparkles" size={12} color="#FFF" />
                        </View>
                    </TouchableOpacity>
                    
                    <Text style={styles.userName}>{profileName}</Text>
                    <Text style={styles.userEmail}>{profileEmail}</Text>
                    <Text style={styles.userBio}>"{profileBio}"</Text>
                </View>
                
                {/* Stats Scorecard Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{completedTasksCount}</Text>
                        <Text style={styles.statText}>Tasks Done</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{activeHabitsCount}</Text>
                        <Text style={styles.statText}>Habits</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{bestHabitStreak}</Text>
                        <Text style={styles.statText}>Best Streak</Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView 
                style={styles.scrollView} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 140 }}
            >
                {/* Dynamic XP Progress Card */}
                <View style={styles.levelCardContainer}>
                    <LinearGradient
                        colors={theme === 'dark' ? ['#1F2937', '#111827'] : ['#FFFFFF', '#F3F4F6']}
                        style={styles.levelCard}
                    >
                        <View style={styles.levelHeader}>
                            <View>
                                <Text style={styles.levelTitle}>
                                    {getLevelTitle(userLevel)}
                                </Text>
                                <Text style={styles.levelSubtitle}>
                                    Level {userLevel} • {totalCompletions} total actions completed
                                </Text>
                            </View>
                            <View style={styles.levelHexBadge}>
                                <Text style={styles.levelHexText}>{userLevel}</Text>
                            </View>
                        </View>

                        {/* Glowing progress slider bar */}
                        <View style={styles.xpBarBg}>
                            <LinearGradient
                                colors={['#A78BFA', '#EC4899']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.xpBarFill, { width: `${xpProgress * 100}%` }]}
                            />
                        </View>

                        <Text style={styles.xpProgressText}>
                            {totalCompletions % 8} / 8 actions to Level {userLevel + 1}
                        </Text>
                    </LinearGradient>
                </View>

                {/* Locations Section with dynamic aesthetics */}
                <View style={styles.menuSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Saved Weather Cities</Text>
                        <TouchableOpacity 
                          style={styles.addLocationBtn}
                          onPress={() => setShowLocationsModal(true)}
                        >
                            <Ionicons name="add" size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                    
                    {locations.length === 0 ? (
                        <View style={styles.emptyLocations}>
                            <Ionicons name="location-outline" size={40} color={colors.textSecondary} />
                            <Text style={styles.emptyLocationsText}>No locations saved</Text>
                            <Text style={styles.emptyLocationsSubtext}>Add your favorite cities to track local weather</Text>
                        </View>
                    ) : (
                        <View style={styles.locationsCard}>
                            {locations.map((location, index) => (
                                <View key={location.id}>
                                    <TouchableOpacity 
                                        style={[
                                            styles.locationItem,
                                            location.isPrimary && styles.locationItemPrimary
                                        ]}
                                        onPress={() => !location.isPrimary && setPrimaryLocation(location.id)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={styles.locationInfo}>
                                            <Text style={styles.locationName}>{location.name}</Text>
                                            {location.isPrimary && (
                                                <Text style={styles.locationPrimaryBadge}>Primary Location</Text>
                                            )}
                                        </View>
                                        <TouchableOpacity 
                                            style={styles.deleteBtn}
                                            onPress={() => handleRemoveLocation(location.id)}
                                            disabled={locations.length === 1}
                                        >
                                            <Ionicons name="close-circle" size={22} color={locations.length === 1 ? colors.divider : colors.error} />
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                    {index !== locations.length - 1 && <View style={styles.locationDivider} />}
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Preferences & System settings grid */}
                {menuItems.map((section, sectionIndex) => (
                    <View key={sectionIndex} style={styles.menuSection}>
                        <Text style={styles.sectionTitle}>{section.section}</Text>
                        <View style={styles.menuCard}>
                            {section.items.map((item, itemIndex) => (
                                <TouchableOpacity
                                    key={itemIndex}
                                    style={[
                                        styles.menuItem,
                                        itemIndex !== section.items.length - 1 && styles.menuItemBorder
                                    ]}
                                    onPress={item.onPress}
                                    disabled={item.hasSwitch}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.menuItemLeft}>
                                        <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                                            <Ionicons name={item.icon as any} size={20} color={item.color} />
                                        </View>
                                        <Text style={styles.menuLabel}>{item.label}</Text>
                                    </View>
                                    
                                    {item.hasSwitch ? (
                                        <Switch
                                            value={item.value}
                                            onValueChange={item.onToggle}
                                            trackColor={{ false: colors.border, true: item.color + '60' }}
                                            thumbColor={item.value ? item.color : colors.surface}
                                        />
                                    ) : (
                                        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}

                {/* Danger Zone */}
                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>Account Actions</Text>
                    <TouchableOpacity 
                        style={styles.logoutButton}
                        onPress={() => Alert.alert('Sign Out', 'OrbitOne demo account remains locally cached in this device.', [{ text: 'Cancel' }, { text: 'Clear Storage & Log Out', style: 'destructive', onPress: async () => {
                            await AsyncStorage.clear();
                            Alert.alert('Reset Successful', 'Restart the app to view freshly seeded logs.');
                        } }])}
                    >
                        <Ionicons name="log-out-outline" size={20} color={colors.error} />
                        <Text style={styles.logoutText}>Reset App & Log Out</Text>
                    </TouchableOpacity>
                </View>

                {/* App Mascot Illustration */}
                <View style={styles.mascotContainer}>
                    <AppMascot width={100} height={100} />
                </View>

                {/* App Info Footer */}
                <View style={styles.appInfo}>
                    <Text style={styles.appInfoText}>OrbitOne v1.2.0</Text>
                    <Text style={styles.appInfoText}>A premium productivity environment</Text>
                </View>
            </ScrollView>

            {/* Mascot Carousel Picker Modal */}
            <Modal
                visible={showMascotModal}
                animationType="slide"
                transparent={true}
                statusBarTranslucent={true}
                onRequestClose={() => setShowMascotModal(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowMascotModal(false)}
                >
                    <View style={styles.actionSheet}>
                        <View style={styles.grabber} />
                        
                        <View style={styles.actionSheetContent}>
                            <Text style={styles.sheetTitle}>Choose Your Mascot</Text>
                            <Text style={styles.sheetSubtitle}>Customize your profile avatar</Text>
                            
                            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380, marginTop: 12 }}>
                                {PRESET_MASCOTS.map(mascot => {
                                    const isSelected = profileMascot === mascot.id;
                                    return (
                                        <TouchableOpacity 
                                            key={mascot.id}
                                            style={[
                                                styles.mascotCard,
                                                isSelected && { borderColor: mascot.color, backgroundColor: mascot.color + '05' }
                                            ]}
                                            onPress={() => handleSelectMascot(mascot.id)}
                                            activeOpacity={0.85}
                                        >
                                            <View style={[styles.mascotIconBox, { backgroundColor: mascot.color }]}>
                                                <Ionicons name={mascot.icon as any} size={26} color="#FFF" />
                                            </View>
                                            <View style={{ flex: 1, gap: 4 }}>
                                                <Text style={[styles.mascotCardTitle, isSelected && { color: mascot.color, fontWeight: 'bold' }]}>
                                                    {mascot.name}
                                                </Text>
                                                <Text style={styles.mascotCardDesc}>{mascot.desc}</Text>
                                            </View>
                                            
                                            {isSelected && (
                                                <Ionicons name="checkmark-circle" size={24} color={mascot.color} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Edit details Slide-up Modal */}
            <Modal
                visible={showEditModal}
                animationType="slide"
                transparent={true}
                statusBarTranslucent={true}
                onRequestClose={() => setShowEditModal(false)}
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
                                <Text style={styles.modalTitle}>Edit Profile Settings</Text>
                                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
                                <Text style={styles.fieldLabel}>Display Name</Text>
                                <TextInput
                                    placeholder="Enter your name..."
                                    placeholderTextColor={colors.textTertiary}
                                    style={styles.inputField}
                                    value={tempName}
                                    onChangeText={setTempName}
                                />

                                <Text style={styles.fieldLabel}>Email Address</Text>
                                <TextInput
                                    placeholder="user@example.com"
                                    placeholderTextColor={colors.textTertiary}
                                    style={styles.inputField}
                                    value={tempEmail}
                                    onChangeText={setTempEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />

                                <Text style={styles.fieldLabel}>Profile Bio & Motto</Text>
                                <TextInput
                                    placeholder="Compound your daily strengths..."
                                    placeholderTextColor={colors.textTertiary}
                                    style={[styles.inputField, { height: 70, textAlignVertical: 'top' }]}
                                    value={tempBio}
                                    onChangeText={setTempBio}
                                    multiline={true}
                                />

                                <TouchableOpacity 
                                    style={[styles.submitBtn, { backgroundColor: activeMascot.color }]}
                                    onPress={handleSaveProfileDetails}
                                >
                                    <Text style={styles.submitText}>Save Changes</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </SafeAreaView>
                    </KeyboardAvoidingView>
                </SafeAreaProvider>
            </Modal>

            {/* Locations Modal */}
            <Modal
                visible={showLocationsModal}
                animationType="slide"
                statusBarTranslucent={true}
                onRequestClose={() => {
                    setShowLocationsModal(false);
                    setSearchQuery('');
                }}
            >
                <SafeAreaProvider>
                    <SafeAreaView style={styles.locationsModalContainer} edges={['top']}>
                        <View style={styles.modalHeaderLocation}>
                            <TouchableOpacity onPress={() => {
                                setShowLocationsModal(false);
                                setSearchQuery('');
                            }}>
                                <Ionicons name="close" size={28} color={colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.modalTitleLocation}>Add Weather City</Text>
                            <View style={{ width: 28 }} />
                        </View>

                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color={colors.textSecondary} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search major cities..."
                                placeholderTextColor={colors.textSecondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus={true}
                            />
                            {searchQuery ? (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        <FlatList
                            data={filteredPresets}
                            keyExtractor={(item) => item.name}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.presetLocation}
                                    onPress={() => {
                                        handleAddLocation(item);
                                        setSearchQuery('');
                                        setShowLocationsModal(false);
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.presetLocationLeft}>
                                        <Ionicons name="location" size={20} color="#8B5CF6" />
                                        <Text style={styles.presetLocationName}>{item.name}</Text>
                                    </View>
                                    <Ionicons name="add-circle" size={24} color="#8B5CF6" />
                                </TouchableOpacity>
                            )}
                            contentContainerStyle={styles.listContainer}
                            scrollEnabled={true}
                        />
                    </SafeAreaView>
                </SafeAreaProvider>
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
        paddingBottom: 24,
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
        shadowColor: '#EC4899',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 6,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarLargeContainer: {
        position: 'relative',
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6,
    },
    avatarLarge: {
        width: 86,
        height: 86,
        borderRadius: 43,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#FFF',
    },
    avatarEditBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 13,
        color: '#FFF',
        opacity: 0.85,
        marginBottom: 8,
    },
    userBio: {
        fontSize: 12,
        color: '#FFF',
        opacity: 0.95,
        fontStyle: 'italic',
        textAlign: 'center',
        paddingHorizontal: 24,
        lineHeight: 18,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 2,
    },
    statText: {
        fontSize: 12,
        color: '#FFF',
        opacity: 0.9,
    },
    statDivider: {
        width: 1,
        height: 34,
        backgroundColor: '#FFF',
        opacity: 0.3,
    },
    scrollView: {
        flex: 1,
    },
    levelCardContainer: {
        paddingHorizontal: 20,
        marginTop: 24,
    },
    levelCard: {
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
    levelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    levelTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
    },
    levelSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    levelHexBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#EC4899' + '15',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#EC4899',
    },
    levelHexText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#EC4899',
    },
    xpBarBg: {
        height: 8,
        backgroundColor: colors.surfaceSecondary,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 10,
    },
    xpBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    xpProgressText: {
        fontSize: 11,
        color: colors.textSecondary,
        alignSelf: 'flex-end',
        fontWeight: '600',
    },
    menuSection: {
        paddingHorizontal: 20,
        marginTop: 26,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    menuCard: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    menuItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    menuIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    menuLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.text,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        paddingVertical: 16,
        borderRadius: 20,
        gap: 8,
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    logoutText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.error,
    },
    mascotContainer: {
        alignItems: 'center',
        marginTop: 32,
        marginBottom: 8,
        opacity: 0.85,
    },
    appInfo: {
        alignItems: 'center',
        marginTop: 12,
        gap: 4,
    },
    appInfoText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    addLocationBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#8B5CF6',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 3,
    },
    emptyLocations: {
        alignItems: 'center',
        paddingVertical: 32,
        backgroundColor: colors.surfaceSecondary,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    emptyLocationsText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
        marginTop: 10,
    },
    emptyLocationsSubtext: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
    },
    locationsCard: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    locationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderLeftWidth: 5,
        borderLeftColor: 'transparent',
    },
    locationItemPrimary: {
        borderLeftColor: '#8B5CF6',
        backgroundColor: '#8B5CF6' + '08',
    },
    locationInfo: {
        flex: 1,
    },
    locationName: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    locationPrimaryBadge: {
        fontSize: 11,
        color: '#8B5CF6',
        fontWeight: '600',
    },
    deleteBtn: {
        padding: 6,
    },
    locationDivider: {
        height: 1,
        backgroundColor: colors.divider,
        marginHorizontal: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    actionSheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 8,
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    grabber: {
        width: 40,
        height: 5,
        backgroundColor: colors.divider,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 12,
    },
    actionSheetContent: {
        gap: 4,
    },
    sheetTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sheetSubtitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: 4,
        marginBottom: 14,
    },
    mascotCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceSecondary,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: colors.border,
        gap: 12,
    },
    mascotIconBox: {
        width: 50,
        height: 50,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
    },
    mascotCardTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    mascotCardDesc: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 16,
    },
    formCard: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 8,
        paddingHorizontal: 20,
        maxHeight: '90%',
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
    locationsModalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    modalHeaderLocation: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    modalTitleLocation: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    searchInput: {
        flex: 1,
        marginHorizontal: 8,
        fontSize: 16,
        color: colors.text,
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    presetLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 12,
        marginVertical: 6,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    presetLocationLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    presetLocationName: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
    },
});
