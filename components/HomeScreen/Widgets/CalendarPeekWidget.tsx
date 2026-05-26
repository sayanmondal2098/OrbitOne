import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';

function EventItem({ time, title }: { time: string; title: string }) {
    return (
        <View style={styles.eventItem}>
            <Text style={styles.eventTime}>{time}</Text>
            <Text style={styles.eventTitle}>{title}</Text>
        </View>
    );
}

export default function CalendarPeekWidget() {
    return (
        <View style={styles.widget}>
            <Text style={styles.widgetTitle}>Calendar Peek</Text>
            <View style={styles.eventList}>
                <EventItem time="10:00 AM" title="Team Standup" />
                <EventItem time="2:00 PM" title="Client Call" />
                <EventItem time="4:30 PM" title="Design Review" />
            </View>
            <View style={styles.widgetActions}>
                <TouchableOpacity>
                    <Text style={styles.linkText}>Add event</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                    <Text style={styles.linkText}>Open calendar</Text>
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
    widgetTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.light.text,
        marginBottom: Layout.spacing.sm,
    },
    eventList: {
        gap: 12,
    },
    eventItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    eventTime: {
        fontSize: 14,
        color: Colors.light.textSecondary,
        width: 80,
    },
    eventTitle: {
        fontSize: 15,
        color: Colors.light.text,
        flex: 1,
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
