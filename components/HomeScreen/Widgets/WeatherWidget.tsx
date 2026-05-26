import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';

function HourlyWeather({ time, temp, icon }: { time: string; temp: string; icon: string }) {
    return (
        <View style={styles.hourlyItem}>
            <Text style={styles.hourlyTime}>{time}</Text>
            <Text style={styles.hourlyIcon}>{icon}</Text>
            <Text style={styles.hourlyTemp}>{temp}</Text>
        </View>
    );
}

export default function WeatherWidget() {
    return (
        <View style={styles.widget}>
            <Text style={styles.widgetTitle}>Weather</Text>
            <View style={styles.weatherCurrent}>
                <Text style={styles.weatherTemp}>22°C</Text>
                <Text style={styles.weatherCondition}>Partly Cloudy</Text>
            </View>
            <View style={styles.weatherForecast}>
                <HourlyWeather time="2PM" temp="23°" icon="☀️" />
                <HourlyWeather time="4PM" temp="24°" icon="☀️" />
                <HourlyWeather time="6PM" temp="21°" icon="🌤️" />
                <HourlyWeather time="8PM" temp="19°" icon="🌙" />
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
    },
    weatherCurrent: {
        alignItems: 'center',
        paddingVertical: Layout.spacing.md,
    },
    weatherTemp: {
        fontSize: 48,
        fontWeight: '700',
        color: Colors.light.text,
    },
    weatherCondition: {
        fontSize: 16,
        color: Colors.light.textSecondary,
        marginTop: 4,
    },
    weatherForecast: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: Layout.spacing.md,
    },
    hourlyItem: {
        alignItems: 'center',
        gap: 4,
    },
    hourlyTime: {
        fontSize: 12,
        color: Colors.light.textSecondary,
    },
    hourlyIcon: {
        fontSize: 24,
    },
    hourlyTemp: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
    },
});
