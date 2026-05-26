import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';

function NewsItem({ title }: { title: string }) {
    return (
        <TouchableOpacity style={styles.newsItem}>
            <Text style={styles.newsTitle}>{title}</Text>
        </TouchableOpacity>
    );
}

export default function NewsWidget() {
    return (
        <View style={styles.widget}>
            <Text style={styles.widgetTitle}>News Headlines</Text>
            <View style={styles.newsList}>
                <NewsItem title="Tech giant announces new AI breakthrough" />
                <NewsItem title="Markets reach new highs amid recovery" />
                <NewsItem title="Climate summit yields positive results" />
            </View>
            <TouchableOpacity style={styles.linkWrapper}>
                <Text style={styles.linkText}>Open feed</Text>
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
    newsList: {
        gap: 12,
    },
    newsItem: {
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    newsTitle: {
        fontSize: 15,
        color: Colors.light.text,
        lineHeight: 20,
    },
    linkWrapper: {
        marginTop: Layout.spacing.sm,
    },
    linkText: {
        color: Colors.light.primary,
        fontSize: 14,
        fontWeight: '500',
    },
});
