import React from 'react';
import { StyleSheet, View, ScrollView, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useTheme } from '../context/ThemeContext';

export default function HabitsScreen() {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    const habits = [
        { id: 1, name: 'Morning Exercise', streak: 12, completed: true, icon: 'barbell', color: '#667EEA', goal: '30 min' },
        { id: 2, name: 'Read Books', streak: 8, completed: false, icon: 'book', color: '#F093FB', goal: '20 pages' },
        { id: 3, name: 'Drink Water', streak: 5, completed: true, icon: 'water', color: '#4FACFE', goal: '8 glasses' },
        { id: 4, name: 'Meditation', streak: 15, completed: false, icon: 'leaf', color: '#43E97B', goal: '15 min' },
        { id: 5, name: 'Journal', streak: 3, completed: false, icon: 'create', color: '#FA709A', goal: '10 min' },
    ];

    const stats = [
        { label: 'Current Streak', value: '12', icon: 'flame', color: '#FF6B6B' },
        { label: 'Total Habits', value: '5', icon: 'grid', color: '#4ECDC4' },
        { label: 'Completion', value: '80%', icon: 'trending-up', color: '#95E1D3' },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <LinearGradient
                colors={['#43E97B', '#38F9D7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <Text style={styles.headerTitle}>Habits</Text>
                <Text style={styles.headerSubtitle}>Build better habits every day</Text>
            </LinearGradient>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Stats Cards */}
                <View style={styles.statsContainer}>
                    {stats.map((stat, index) => (
                        <View key={index} style={styles.statCard}>
                            <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                                <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                            </View>
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Today's Habits */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Today's Habits</Text>
                    {habits.map(habit => (
                        <View key={habit.id} style={styles.habitCard}>
                            <LinearGradient
                                colors={[habit.color + '20', habit.color + '10']}
                                style={styles.habitIconContainer}
                            >
                                <Ionicons name={habit.icon as any} size={24} color={habit.color} />
                            </LinearGradient>
                            
                            <View style={styles.habitContent}>
                                <View style={styles.habitHeader}>
                                    <Text style={styles.habitName}>{habit.name}</Text>
                                    <View style={styles.streakContainer}>
                                        <Ionicons name="flame" size={16} color="#FF6B6B" />
                                        <Text style={styles.streakText}>{habit.streak}</Text>
                                    </View>
                                </View>
                                <Text style={styles.habitGoal}>Goal: {habit.goal}</Text>
                            </View>
                            
                            <TouchableOpacity style={[styles.checkbox, habit.completed && styles.checkboxCompleted]}>
                                {habit.completed && <Ionicons name="checkmark" size={20} color="#FFF" />}
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>

                {/* Weekly Progress */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>This Week</Text>
                    <View style={styles.weekProgress}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                            <View key={day} style={styles.dayColumn}>
                                <Text style={styles.dayLabel}>{day}</Text>
                                <View style={styles.dayBars}>
                                    {[1, 2, 3, 4, 5].map(bar => (
                                        <View
                                            key={bar}
                                            style={[
                                                styles.progressBar,
                                                index <= 4 && bar <= 4 && styles.progressBarFilled
                                            ]}
                                        />
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Achievements */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Achievements</Text>
                    <View style={styles.achievementsList}>
                        <View style={styles.achievementCard}>
                            <LinearGradient
                                colors={['#FFD700', '#FFA500']}
                                style={styles.achievementIcon}
                            >
                                <Ionicons name="trophy" size={24} color="#FFF" />
                            </LinearGradient>
                            <View style={styles.achievementContent}>
                                <Text style={styles.achievementTitle}>7 Day Streak!</Text>
                                <Text style={styles.achievementText}>Keep the momentum going</Text>
                            </View>
                        </View>
                        
                        <View style={styles.achievementCard}>
                            <LinearGradient
                                colors={['#9B59B6', '#8E44AD']}
                                style={styles.achievementIcon}
                            >
                                <Ionicons name="star" size={24} color="#FFF" />
                            </LinearGradient>
                            <View style={styles.achievementContent}>
                                <Text style={styles.achievementTitle}>Perfect Week</Text>
                                <Text style={styles.achievementText}>All habits completed last week</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={{ height: 140 }} />
            </ScrollView>

            {/* Add Habit FAB */}
            <TouchableOpacity style={styles.fab}>
                <LinearGradient
                    colors={['#43E97B', '#38F9D7']}
                    style={styles.fabGradient}
                >
                    <Ionicons name="add" size={28} color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>
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
    scrollView: {
        flex: 1,
    },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 20,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 11,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    section: {
        paddingHorizontal: 20,
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 16,
    },
    habitCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    habitIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    habitContent: {
        flex: 1,
    },
    habitHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    habitName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    streakContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    streakText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FF6B6B',
    },
    habitGoal: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    checkbox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    checkboxCompleted: {
        backgroundColor: colors.success,
        borderColor: colors.success,
    },
    weekProgress: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 16,
    },
    dayColumn: {
        alignItems: 'center',
        gap: 8,
    },
    dayLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    dayBars: {
        gap: 4,
    },
    progressBar: {
        width: 24,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.border,
    },
    progressBarFilled: {
        backgroundColor: colors.success,
    },
    achievementsList: {
        gap: 12,
    },
    achievementCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 16,
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    achievementIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    achievementContent: {
        flex: 1,
    },
    achievementTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    achievementText: {
        fontSize: 13,
        color: colors.textSecondary,
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
});
