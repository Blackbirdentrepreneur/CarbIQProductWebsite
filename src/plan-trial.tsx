import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { ArrowLeft, Calendar, Clock, CreditCard, Star, CheckCircle } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function PlanTrialScreen() {
  const handleStartTrial = () => {
    router.push('/onboarding/plan-exit');
  };

  const handleBack = () => {
    router.back();
  };

  const trialFeatures = [
    {
      day: 'Today',
      title: 'Start your journey',
      description: 'Complete setup and sync your first data',
      icon: Star,
      color: Colors.primary,
    },
    {
      day: 'In 2 Days',
      title: 'Reminder',
      description: 'Get personalized insights from your data',
      icon: Clock,
      color: Colors.warning,
    },
    {
      day: 'In 3 Days',
      title: 'Billing Starts',
      description: 'Your subscription begins automatically',
      icon: CreditCard,
      color: Colors.error,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Start your 3-day FREE{'\n'}trial to continue.</Text>
        </View>

        <View style={styles.timelineContainer}>
          {trialFeatures.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <View key={index} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineIcon, { backgroundColor: `${feature.color}15` }]}>
                    <IconComponent size={20} color={feature.color} />
                  </View>
                  {index < trialFeatures.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineDay}>{feature.day}</Text>
                  <Text style={styles.timelineTitle}>{feature.title}</Text>
                  <Text style={styles.timelineDescription}>{feature.description}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.phoneContainer}>
          <View style={styles.phoneFrame}>
            <View style={styles.phoneScreen}>
              <View style={styles.mockHeader}>
                <View style={styles.mockStatusBar}>
                  <Text style={styles.mockTime}>9:41</Text>
                  <View style={styles.mockSignal} />
                </View>
              </View>
              
              <View style={styles.mockContent}>
                <View style={styles.mockTrialBanner}>
                  <Text style={styles.mockTrialText}>3-Day Trial Active</Text>
                  <CheckCircle size={16} color={Colors.success} />
                </View>
              </View>
            </View>
          </View>
          
          <View style={styles.freeLabel}>
            <Star size={16} color={Colors.success} />
            <Text style={styles.freeLabelText}>No Payment Due Now</Text>
          </View>
        </View>

        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>Benefits</Text>
          <View style={styles.benefitsList}>
            <Text style={styles.benefitItem}>• Unlimited AI food analysis</Text>
            <Text style={styles.benefitItem}>• Advanced glucose insights</Text>
            <Text style={styles.benefitItem}>• Personalized recommendations</Text>
            <Text style={styles.benefitItem}>• Priority customer support</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.startButton} onPress={handleStartTrial}>
          <Text style={styles.startButtonText}>Start My 3-Day Free Trial</Text>
        </TouchableOpacity>
        
        <View style={styles.pricingInfo}>
          <Text style={styles.priceText}>$1.99/month</Text>
        </View>

        <Text style={styles.disclaimerText}>
          Cancel anytime. 
        </Text>
        <Text style={styles.disclaimerText}>
        No commitment required.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  titleSection: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: Colors.text,
    lineHeight: 34,
    textAlign: 'center',
  },
  timelineContainer: {
    marginBottom: 32,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    height: 40,
    backgroundColor: Colors.border,
    marginTop: 8,
  },
  timelineContent: {
    flex: 1,
  },
  timelineDay: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: Colors.primary,
    marginBottom: 4,
  },
  timelineTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.text,
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  phoneContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  phoneFrame: {
    width: width * 0.5,
    height: width * 0.9,
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  phoneScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 18,
    overflow: 'hidden',
  },
  mockHeader: {
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  mockStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mockTime: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: Colors.text,
  },
  mockSignal: {
    width: 16,
    height: 10,
    backgroundColor: Colors.text,
    borderRadius: 2,
  },
  mockContent: {
    flex: 1,
    padding: 12,
    gap: 12,
  },
  mockTrialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${Colors.success}15`,
    padding: 12,
    borderRadius: 8,
  },
  mockTrialText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: Colors.success,
  },
  mockInsightCard: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
  },
  mockInsightTitle: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: Colors.text,
    marginBottom: 4,
  },
  mockInsightText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: Colors.textSecondary,
  },
  freeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.success}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
    gap: 6,
  },
  freeLabelText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: Colors.success,
  },
  benefitsContainer: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  benefitsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: Colors.text,
    marginBottom: 12,
  },
  benefitsList: {
    gap: 8,
  },
  benefitItem: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: Colors.text,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.background,
  },
  pricingInfo: {
    marginBottom: 12,
  },
  priceText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.text,
  },
  disclaimerText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});