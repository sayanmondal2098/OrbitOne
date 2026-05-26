import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';

function TaskItem({ title }: { title: string }) {
    return (
        <TouchableOpacity style={styles.taskItem}>
            <View style={styles.checkbox} />
            <Text style={styles.taskText}>{title}</Text>
        </TouchableOpacity>
    );
}

export default function TodayTasksWidget() {
    return (
        <View style={styles.widget}>
            <View style={styles.widgetHeader}>
                <Text style={styles.widgetTitle}>Today Tasks</Text>
                <View style={styles.badge} />
            </View>
            <View style={styles.taskList}>
                <TaskItem title="Review project proposal" />
                <TaskItem title="Team standup at 10 AM" />
                <TaskItem title="Finish design mockups" />
            </View>
            <View style={styles.widgetActions}>
                <TouchableOpacity>
                    <Text style={styles.linkText}>+ Add task</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                    <Text style={styles.linkText}>View all</Text>
                </TouchableOpacity>
            </View>
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
    widgetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Layout.spacing.sm,
    },
    widgetTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.light.text,
    },
    badge: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.light.error,
        marginLeft: 8,
    },
    taskList: {
        gap: 8,
    },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: Colors.light.primary,
        marginRight: 12,
    },
    taskText: {
        fontSize: 15,
        color: Colors.light.text,
    },
    widgetActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
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
