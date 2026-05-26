import Constants from 'expo-constants';
import { Pressable, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function FAB() {
    return (
        <Pressable style={styles.fab}>
            <Ionicons name="add" size={32} color="#fff" />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.light.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.light.cardShadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});
