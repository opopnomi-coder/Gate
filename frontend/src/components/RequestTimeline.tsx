import React from 'react';
import { View, StyleSheet } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme } from '../context/ThemeContext';
import ThemedText from './ThemedText';

interface RequestTimelineProps {
  status: string;
  staffApproval: string;
  hodApproval: string;
  requestDate: string;
  staffRemark?: string;
  hodRemark?: string;
}

const RequestTimeline: React.FC<RequestTimelineProps> = ({
  status,
  staffApproval,
  hodApproval,
  staffRemark,
  hodRemark,
}) => {
  const { theme } = useTheme();

  const getStepStatus = (step: number) => {
    if (status === 'REJECTED') {
      if (step === 1) return 'completed';
      if (step === 2 && staffApproval === 'REJECTED') return 'rejected';
      if (step === 3 && hodApproval === 'REJECTED') return 'rejected';
      return 'pending';
    }

    if (status === 'APPROVED') {
      return 'completed';
    }

    if (step === 1) return 'completed';
    if (step === 2) {
      if (staffApproval === 'APPROVED') return 'completed';
      if (staffApproval === 'REJECTED') return 'rejected';
      return 'active';
    }
    if (step === 3) {
      if (hodApproval === 'APPROVED') return 'completed';
      if (hodApproval === 'REJECTED') return 'rejected';
      if (staffApproval === 'APPROVED') return 'active';
      return 'pending';
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
    { label: 'Staff Approval', step: 2 },
    { label: 'HOD Approval', step: 3 },
  ];

  const getCompletedStepsCount = () => {
    let count = 1;
    if (staffApproval === 'APPROVED') count++;
    if (hodApproval === 'APPROVED') count++;
    return count;
  };

  const progressPercentage = (getCompletedStepsCount() / 3) * 100;

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={[styles.progressBarContainer, { backgroundColor: theme.border }]}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${progressPercentage}%`,
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
          <View key={item.step} style={styles.stepContainer}>
            <View style={styles.stepIndicator}>
              <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                <Ionicons name={icon as any} size={28} color={color} />
              </View>
              {index < steps.length - 1 && (
                <View style={[styles.connector, { backgroundColor: getStepColor(getStepStatus(item.step + 1)) + '40' }]} />
              )}
            </View>
            <View style={styles.stepContent}>
              <ThemedText style={[styles.stepLabel, { color: theme.text }]}>{item.label}</ThemedText>
              <ThemedText style={[styles.stepStatus, { color }]}>
                {stepStatus === 'completed' ? '✓ Completed' :
                 stepStatus === 'rejected' ? '✗ Rejected' :
                 stepStatus === 'active' ? '⏳ In Progress' : '○ Pending'}
              </ThemedText>
              {item.step === 2 && staffRemark && (
                <View style={[styles.remarkContainer, { backgroundColor: theme.inputBackground, borderLeftColor: theme.warning }]}>
                  <ThemedText style={[styles.remarkLabel, { color: theme.textSecondary }]}>Staff Remark:</ThemedText>
                  <ThemedText style={[styles.remarkText, { color: theme.text }]}>{staffRemark}</ThemedText>
                </View>
              )}
              {item.step === 3 && hodRemark && (
                <View style={[styles.remarkContainer, { backgroundColor: theme.inputBackground, borderLeftColor: theme.warning }]}>
                  <ThemedText style={[styles.remarkLabel, { color: theme.textSecondary }]}>HOD Remark:</ThemedText>
                  <ThemedText style={[styles.remarkText, { color: theme.text }]}>{hodRemark}</ThemedText>
                </View>
              )}
            </View>
          </View>
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
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
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
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  remarkText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default RequestTimeline;
