import React from 'react';
import {
    TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import ThemedText from './ThemedText';

interface CustomButtonProps {
    onPress: () => void;
    title: string;
    type?: 'primary' | 'secondary' | 'ghost' | 'danger';
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    icon?: string;
    gradient?: string[];
}

const CustomButton = ({
    onPress,
    title,
    type = 'primary',
    loading = false,
    disabled = false,
    style,
    textStyle,
    icon,
    gradient,
}: CustomButtonProps) => {
    const { theme } = useTheme();

    const getGradientColors = () => {
        if (gradient) return gradient;
        if (disabled) return ['#9e9e9e', '#757575'];

        switch (type) {
            case 'secondary': return theme.gradients.secondary;
            case 'danger': return (theme.gradients as { error?: string[] }).error ?? [theme.error, theme.error];
            case 'ghost': return ['transparent', 'transparent'];
            default: return theme.gradients.primary;
        }
    };

    const renderContent = () => (
        <View style={styles.content}>
            {loading ? (
                <ActivityIndicator color={type === 'ghost' ? theme.primary : '#FFF'} size="small" />
            ) : (
                <>
                    {icon && <ThemedText style={[styles.icon, { color: type === 'ghost' ? theme.primary : '#FFF' }]}>{icon}</ThemedText>}
                    <ThemedText style={[
                        styles.text,
                        { color: type === 'ghost' ? theme.primary : '#FFF' },
                        textStyle
                    ]}>
                        {title}
                    </ThemedText>
                </>
            )}
        </View>
    );

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
            style={[
                styles.button,
                type === 'ghost' && { borderWidth: 2, borderColor: theme.primary, backgroundColor: 'transparent' },
                style
            ]}
        >
            {type !== 'ghost' ? (
                <LinearGradient
                    colors={getGradientColors() as [string, string, ...string[]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradient}
                >
                    {renderContent()}
                </LinearGradient>
            ) : (
                renderContent()
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        borderRadius: 16,
        overflow: 'hidden',
        height: 56,
        marginVertical: 8,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    gradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    icon: {
        fontSize: 20,
        marginRight: 10,
    },
});

export default CustomButton;
