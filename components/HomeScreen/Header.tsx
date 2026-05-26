import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';

export default function Header() {
    return (
        <View style={styles.header}>
            <TouchableOpacity style={styles.avatar}>
                <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>JD</Text>
                </View>
            </TouchableOpacity>

            <Text style={styles.dateText}>Today, Mon 9 Feb</Text>

            <View style={styles.headerActions}>
                <TouchableOpacity style={styles.iconButton}>
                    <Ionicons name="search" size={24} color={Colors.light.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton}>
                    <Ionicons name="add" size={24} color={Colors.light.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Layout.spacing.md,
        paddingVertical: Layout.spacing.sm,
        backgroundColor: Colors.light.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
        paddingTop: 10, // Adjust for status bar if not handled by SafeAreaView elsewhere, but usually SafeAreaView is better
    },
    avatar: {
        width: 40,
        height: 40,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.light.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    dateText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.light.text,
        flex: 1,
        textAlign: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        gap: Layout.spacing.sm,
    },
    iconButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
});
