import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';

function HabitItem({ name, streak, done }: { name: string; streak: number; done: boolean }) {
    return (
        <TouchableOpacity style={styles.habitItem}>
            <View style={[styles.habitCheckbox, done && styles.habitCheckboxDone]}>
                {done && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <View style={styles.habitInfo}>
                <Text style={styles.habitName}>{name}</Text>
                <Text style={styles.habitStreak}>🔥 {streak} day streak</Text>
            </View>
        </TouchableOpacity>
    );
}

export default function HabitsWidget() {
    return (
        <View style={styles.widget}>
            <Text style={styles.widgetTitle}>Habits Summary</Text>
            <View style={styles.habitList}>
                <HabitItem name="Morning Exercise" streak={12} done={true} />
                <HabitItem name="Read 30 minutes" streak={8} done={false} />
                <HabitItem name="Drink 8 glasses water" streak={5} done={true} />
            </View>
            <TouchableOpacity style={styles.viewHabitsLink}>
                <Text style={styles.linkText}>View habits</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    widget: {
        backgroundColor: Colors.light.surface,
        borderRadius: Layout.borderRadius.md,
        padding: Layout.spacing.md,
        marginBottom: Layout.spacing.md,
        shadowColor: Colors.light.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    widgetTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.light.text,
        marginBottom: Layout.spacing.sm,
    },
    habitList: {
        gap: 12,
    },
    habitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    habitCheckbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.light.primary,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    habitCheckboxDone: {
        backgroundColor: Colors.light.primary,
    },
    checkmark: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    habitInfo: {
        flex: 1,
    },
    habitName: {
        fontSize: 15,
        color: Colors.light.text,
        marginBottom: 2,
    },
    habitStreak: {
        fontSize: 13,
        color: Colors.light.textSecondary,
    },
    viewHabitsLink: {
        marginTop: Layout.spacing.sm,
        paddingTop: Layout.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.light.border,
    },
    linkText: {
        color: Colors.light.primary,
        fontSize: 14,
        fontWeight: '500',
    },
});
