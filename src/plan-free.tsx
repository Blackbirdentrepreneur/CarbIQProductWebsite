import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { ArrowLeft, Star, Zap, Heart, Shield } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function PlanFreeScreen() {
  const handleTryFree = () => {
    router.push('/onboarding/plan-trial');
  };

  const handleSkip = () => {
    router.push('/onboarding/complete');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>We want you to{'\n'}try CarbIQ for free.</Text>
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
                <View style={styles.mockCard}>
                  <View style={styles.mockGlucoseCircle}>
                    <Text style={styles.mockGlucoseValue}>142</Text>
                    <Text style={styles.mockGlucoseUnit}>mg/dL</Text>
                  </View>
                  <Text style={styles.mockCardTitle}>Today's Glucose</Text>
                </View>
                
                <View style={styles.mockStats}>
                  <View style={styles.mockStat}>
                    <Text style={styles.mockStatValue}>8</Text>
                    <Text style={styles.mockStatLabel}>Foods</Text>
                  </View>
                  <View style={styles.mockStat}>
                    <Text style={styles.mockStatValue}>45</Text>
                    <Text style={styles.mockStatLabel}>Active Min</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.tryButton} onPress={handleTryFree}>
          <Text style={styles.tryButtonText}>Try for $0.00</Text>
        </TouchableOpacity>
        <View style={styles.freeLabel}>
            <Star size={16} color={Colors.warning} />
            <Text style={styles.freeLabelText}>No Payment Due Now</Text>
        </View>
        <View style={styles.pricingInfo}>
          <Text style={styles.originalPrice}>$1.99/month</Text>
          <Text style={styles.yearlyPrice}>(or $23.99/year)</Text>
        </View>
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
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: Colors.text,
    lineHeight: 38,
    textAlign: 'center',
  },
  phoneContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  phoneFrame: {
    width: width * 0.6,
    height: width * 1.2,
    backgroundColor: '#1a1a1a',
    borderRadius: 32,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  phoneScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 24,
    overflow: 'hidden',
  },
  mockHeader: {
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  mockStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mockTime: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: Colors.text,
  },
  mockSignal: {
    width: 20,
    height: 12,
    backgroundColor: Colors.text,
    borderRadius: 2,
  },
  mockContent: {
    flex: 1,
    padding: 16,
  },
  mockCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  mockGlucoseCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mockGlucoseValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: 'white',
  },
  mockGlucoseUnit: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  mockCardTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.text,
    textAlign: 'center',
    marginTop: 8,
  },
  mockStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  mockStat: {
    alignItems: 'center',
  },
  mockStatValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.text,
    marginBottom: 4,
  },
  mockStatLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  mockAiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}15`,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  mockAiText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.primary,
    flexShrink: 1,
  },
  freeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.warning}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 10,
    gap: 6,
  },
  freeLabelText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: Colors.warning,
  },
  featuresContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: Colors.text,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 5,
    alignItems: 'center',
  },
  tryButton: {
    backgroundColor: Colors.text,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  tryButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: Colors.background,
  },
  pricingInfo: {
    alignItems: 'center',
    marginTop: 50,
  },
  originalPrice: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.text,
    marginBottom: 2,
  },
  yearlyPrice: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: Colors.textSecondary,
  },
  skipText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.textSecondary,
    paddingTop: 15,
  },
});