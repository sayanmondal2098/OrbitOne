import React from 'react';
import { StyleSheet, View, ScrollView, Text, TouchableOpacity, Switch, Modal, FlatList, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { AppMascot } from '../components/illustrations';
import { useLocation } from '../context/LocationContext';
import { useTheme } from '../context/ThemeContext';
import { fetchWeather } from '../services/weatherService';

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
  { name: 'Goa', lat: 15.2993, lon: 73.8243 },
  { name: 'Surat', lat: 21.1458, lon: 72.8353 },
  { name: 'Visakhapatnam', lat: 17.6869, lon: 83.2185 },
  { name: 'Lucknow', lat: 26.8467, lon: 80.9462 },
  { name: 'Kochi', lat: 9.9312, lon: 76.2673 },
  { name: 'Nagpur', lat: 21.1458, lon: 79.0882 },
  { name: 'Bhopal', lat: 23.1815, lon: 79.9864 },
  { name: 'Coimbatore', lat: 11.0081, lon: 76.9124 },
  { name: 'Vadodara', lat: 22.3072, lon: 73.1812 },
];

export default function ProfileScreen() {
    const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
    const [showLocationsModal, setShowLocationsModal] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    
    const { locations, primaryLocation, addLocation, removeLocation, setPrimaryLocation, updateWeather } = useLocation();
    const { theme, colors, toggleTheme } = useTheme();

    // Dynamic styles based on theme
    const styles = React.useMemo(() => createStyles(colors), [colors]);

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
      
      // Fetch weather for this location
      try {
        const weather = await fetchWeather(location.lat, location.lon, id);
        updateWeather(id, weather);
      } catch (error) {
        console.error('Error fetching weather:', error);
      }
    };

    const handleRemoveLocation = (locationId: string) => {
      Alert.alert(
        'Remove Location',
        'Are you sure you want to remove this location?',
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

    const menuItems: Array<{
        section: string;
        items: Array<{
            icon: string;
            label: string;
            color: string;
            hasSwitch?: boolean;
            value?: boolean;
            onToggle?: (value: boolean) => void;
            badge?: string;
        }>;
    }> = [
        {
            section: 'Account',
            items: [
                { icon: 'person-outline', label: 'Edit Profile', color: '#6366F1' },
                { icon: 'mail-outline', label: 'Email Preferences', color: '#EC4899' },
                { icon: 'lock-closed-outline', label: 'Privacy & Security', color: '#14B8A6' },
            ]
        },
        {
            section: 'Preferences',
            items: [
                { icon: 'notifications-outline', label: 'Notifications', color: '#F59E0B', hasSwitch: true, value: notificationsEnabled, onToggle: setNotificationsEnabled },
                { icon: 'moon-outline', label: 'Dark Mode', color: '#8B5CF6', hasSwitch: true, value: theme === 'dark', onToggle: toggleTheme },
                { icon: 'language-outline', label: 'Language', color: '#10B981', badge: 'English' },
            ]
        },
        {
            section: 'Support',
            items: [
                { icon: 'help-circle-outline', label: 'Help Center', color: '#3B82F6' },
                { icon: 'chatbubble-outline', label: 'Contact Support', color: '#06B6D4' },
                { icon: 'star-outline', label: 'Rate App', color: '#F59E0B' },
            ]
        },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header with Profile */}
            <LinearGradient
                colors={['#A18CD1', '#FBC2EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.profileSection}>
                    <LinearGradient
                        colors={['#667EEA', '#764BA2']}
                        style={styles.avatarLarge}
                    >
                        <Text style={styles.avatarLargeText}>JD</Text>
                    </LinearGradient>
                    <Text style={styles.userName}>John Doe</Text>
                    <Text style={styles.userEmail}>john.doe@example.com</Text>
                </View>
                
                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>48</Text>
                        <Text style={styles.statText}>Tasks</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>15</Text>
                        <Text style={styles.statText}>Habits</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>12</Text>
                        <Text style={styles.statText}>Streaks</Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Locations Section */}
                <View style={styles.menuSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Saved Locations</Text>
                        <TouchableOpacity 
                          style={styles.addLocationBtn}
                          onPress={() => setShowLocationsModal(true)}
                        >
                            <Ionicons name="add" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                    
                    {locations.length === 0 ? (
                        <View style={styles.emptyLocations}>
                            <Ionicons name="location-outline" size={48} color={colors.textSecondary} />
                            <Text style={styles.emptyLocationsText}>No locations saved</Text>
                            <Text style={styles.emptyLocationsSubtext}>Add your favorite cities to track weather</Text>
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
                                            <Ionicons name="close-circle" size={24} color={locations.length === 1 ? colors.divider : colors.error} />
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                    {index !== locations.length - 1 && <View style={styles.locationDivider} />}
                                </View>
                            ))}
                        </View>
                    )}
                </View>
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
                                    disabled={item.hasSwitch}
                                >
                                    <View style={styles.menuItemLeft}>
                                        <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                                            <Ionicons name={item.icon as any} size={22} color={item.color} />
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
                                    ) : item.badge ? (
                                        <View style={styles.menuBadge}>
                                            <Text style={styles.menuBadgeText}>{item.badge}</Text>
                                            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                                        </View>
                                    ) : (
                                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}

                {/* Danger Zone */}
                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>Account Actions</Text>
                    <TouchableOpacity style={styles.logoutButton}>
                        <Ionicons name="log-out-outline" size={20} color={colors.error} />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                </View>

                {/* App Mascot */}
                <View style={styles.mascotContainer}>
                    <AppMascot width={120} height={120} />
                </View>

                {/* App Info */}
                <View style={styles.appInfo}>
                    <Text style={styles.appInfoText}>OrbitOne v1.0.0</Text>
                    <Text style={styles.appInfoText}>Made with ❤️ for productivity</Text>
                </View>

                <View style={{ height: 140 }} />
            </ScrollView>

            {/* Locations Modal */}
            <Modal
                visible={showLocationsModal}
                animationType="slide"
                onRequestClose={() => {
                    setShowLocationsModal(false);
                    setSearchQuery('');
                }}
            >
                <SafeAreaView style={styles.modalContainer} edges={['top']}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => {
                            setShowLocationsModal(false);
                            setSearchQuery('');
                        }}>
                            <Ionicons name="close" size={28} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Add Location</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={colors.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search cities..."
                            placeholderTextColor={colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
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
                            >
                                <View style={styles.presetLocationLeft}>
                                    <Ionicons name="location" size={20} color="#6366F1" />
                                    <Text style={styles.presetLocationName}>{item.name}</Text>
                                </View>
                                <Ionicons name="add-circle" size={24} color="#6366F1" />
                            </TouchableOpacity>
                        )}
                        contentContainerStyle={styles.listContainer}
                        scrollEnabled={true}
                    />
                </SafeAreaView>
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
    profileSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarLarge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#FFF',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    avatarLargeText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFF',
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#FFF',
        opacity: 0.9,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 16,
        padding: 16,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 4,
    },
    statText: {
        fontSize: 13,
        color: '#FFF',
        opacity: 0.9,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#FFF',
        opacity: 0.3,
    },
    scrollView: {
        flex: 1,
    },
    menuSection: {
        paddingHorizontal: 20,
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    menuCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
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
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    menuLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
    },
    menuBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    menuBadgeText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.error,
    },
    mascotContainer: {
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 16,
    },
    appInfo: {
        alignItems: 'center',
        marginTop: 16,
        gap: 4,
    },
    appInfoText: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    addLocationBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#6366F1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyLocations: {
        alignItems: 'center',
        paddingVertical: 40,
        backgroundColor: colors.surface,
        borderRadius: 16,
    },
    emptyLocationsText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginTop: 12,
        marginBottom: 4,
    },
    emptyLocationsSubtext: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    locationsCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    locationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: 'transparent',
    },
    locationItemPrimary: {
        borderLeftColor: '#6366F1',
        backgroundColor: '#6366F1' + '08',
    },
    locationInfo: {
        flex: 1,
    },
    locationName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    locationPrimaryBadge: {
        fontSize: 12,
        color: '#6366F1',
        fontWeight: '600',
    },
    deleteBtn: {
        padding: 8,
    },
    locationDivider: {
        height: 1,
        backgroundColor: colors.divider,
        marginHorizontal: 16,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    modalTitle: {
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
