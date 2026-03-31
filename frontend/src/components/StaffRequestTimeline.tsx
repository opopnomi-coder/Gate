import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme } from '../context/ThemeContext';
import ThemedText from './ThemedText';

interface StaffRequestTimelineProps {
  request: any;
}

const StaffRequestTimeline: React.FC<StaffRequestTimelineProps> = ({
  request,
}) => {
  const status = request.status || request.staffApproval || 'PENDING';
  const hodApproval = request.hodApproval || 'PENDING';
  const { theme } = useTheme();
  
  // Animation values for each step (only 2 steps for staff)
  const fadeAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  
  const scaleAnims = useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.3),
  ]).current;
  
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Stagger animation for each step
    const animations = fadeAnims.map((anim, index) =>
      Animated.parallel([
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          delay: index * 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnims[index], {
          toValue: 1,
          tension: 50,
          friction: 7,
          delay: index * 150,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.sequence(animations).start();

    // Progress bar animation
    const completedSteps = getCompletedStepsCount();
    Animated.timing(progressAnim, {
      toValue: completedSteps / 2,
      duration: 800,
      delay: 450,
      useNativeDriver: false,
    }).start();
  }, [status, hodApproval]);

  const getCompletedStepsCount = () => {
    let count = 1; // Request submitted is always completed
    if (hodApproval === 'APPROVED') count++;
    return count;
  };

  const getStepStatus = (step: number) => {
    if (status === 'REJECTED') {
      if (step === 1) return 'completed';
      if (step === 2 && hodApproval === 'REJECTED') return 'rejected';
      return 'pending';
    }

    if (status === 'APPROVED') {
      return 'completed';
    }

    if (step === 1) return 'completed';
    if (step === 2) {
      if (hodApproval === 'APPROVED') return 'completed';
      if (hodApproval === 'REJECTED') return 'rejected';
      return 'active';
    }
    return 'pending';
  };

  const getStepColor = (stepStatus: string) => {
    if (stepStatus === 'completed') return theme.success;
    if (stepStatus === 'rejected') return theme.error;
    if (stepStatus === 'active') return theme.warning;
    return theme.textTertiary;
  };

  const getStepIcon = (stepStatus: string) => {
    if (stepStatus === 'completed') return 'checkmark-circle';
    if (stepStatus === 'rejected') return 'close-circle';
    if (stepStatus === 'active') return 'time';
    return 'ellipse-outline';
  };

  const steps = [
    { label: 'Request Submitted', step: 1 },
    { label: 'HOD Approval', step: 2 },
  ];

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarBackground, { backgroundColor: theme.border }]} />
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: progressWidth,
              backgroundColor: status === 'APPROVED' ? theme.success : 
                              status === 'REJECTED' ? theme.error : theme.warning,
            },
          ]}
        />
      </View>

      {/* Timeline Steps */}
      {steps.map((item, index) => {
        const stepStatus = getStepStatus(item.step);
        const color = getStepColor(stepStatus);
        const icon = getStepIcon(stepStatus);

        return (
          <Animated.View
            key={item.step}
            style={[
              styles.stepContainer,
              {
                opacity: fadeAnims[index],
                transform: [{ scale: scaleAnims[index] }],
              },
            ]}
          >
            <View style={styles.stepIndicator}>
              <Animated.View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: color + '20',
                    transform: [
                      {
                        scale: stepStatus === 'active'
                          ? scaleAnims[index].interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.1],
                            })
                          : 1,
                      },
                    ],
                  },
                ]}
              >
                <Ionicons name={icon as any} size={28} color={color} />
              </Animated.View>
              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    { backgroundColor: getStepColor(getStepStatus(item.step + 1)) + '40' }
                  ]}
                />
              )}
            </View>
            <View style={styles.stepContent}>
              <ThemedText style={[styles.stepLabel, { color: theme.text }]}>{item.label}</ThemedText>
              <ThemedText style={[styles.stepStatus, { color }]}>
                {stepStatus === 'completed' ? '✓ Completed' :
                 stepStatus === 'rejected' ? '✗ Rejected' :
                 stepStatus === 'active' ? '⏳ In Progress' : '○ Pending'}
              </ThemedText>
              {item.step === 2 && request.hodRemark && (
                <View style={[styles.remarkContainer, { backgroundColor: theme.inputBackground, borderLeftColor: theme.warning }]}>
                  <ThemedText style={[styles.remarkLabel, { color: theme.textSecondary }]}>HOD Remark:</ThemedText>
                  <ThemedText style={[styles.remarkText, { color: theme.text }]}>{request.hodRemark}</ThemedText>
                </View>
              )}
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  progressBarContainer: {
    height: 6,
    marginBottom: 24,
    marginHorizontal: 8,
    position: 'relative',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 3,
  },
  progressBarFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 3,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  stepIndicator: {
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: {
    width: 4,
    flex: 1,
    marginTop: 6,
    marginBottom: 6,
    borderRadius: 2,
  },
  stepContent: {
    flex: 1,
    paddingTop: 8,
  },
  stepLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  stepStatus: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  remarkContainer: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  remarkLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  remarkText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default StaffRequestTimeline;
