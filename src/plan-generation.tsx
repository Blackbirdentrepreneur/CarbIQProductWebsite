import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { Colors } from '@/constants/Colors';
import { useUser } from '@/contexts/UserContext';
import { Sparkles, CircleCheck as CheckCircle, Loader, Target, Heart, Activity } from 'lucide-react-native';

const planSteps = [
  'Analyzing your health profile...',
  'Creating personalized meal plans...',
  'Calculating insulin recommendations...',
  'Setting up activity goals...',
  'Generating your diabetes plan...',
];

export default function PlanGenerationScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const { setOnboardingComplete } = useUser();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < planSteps.length - 1) {
          return prev + 1;
        } else {
          setIsComplete(true);
          clearInterval(interval);
          return prev;
        }
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const handleComplete = () => {
    setOnboardingComplete(true);
    router.replace('/onboarding/plan-free');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            {isComplete ? (
              <CheckCircle size={80} color="white" />
            ) : (
              <Sparkles size={80} color="white" />
            )}
          </View>
          
          <Text style={styles.title}>
            {isComplete ? 'Your plan is ready!' : 'Creating your personalized plan'}
          </Text>
          
          <Text style={styles.subtitle}>
            {isComplete 
              ? 'Welcome to your personalized diabetes management journey'
              : 'We\'re analyzing your information to create the perfect diabetes management plan for you.'
            }
          </Text>

          <View style={styles.stepsContainer}>
            {planSteps.map((step, index) => (
              <View key={index} style={styles.stepItem}>
                <View style={[
                  styles.stepIcon,
                  index <= currentStep && styles.stepIconActive,
                  index === currentStep && !isComplete && styles.stepIconCurrent
                ]}>
                  {index < currentStep || isComplete ? (
                    <CheckCircle size={16} color="white" />
                  ) : index === currentStep ? (
                    <Loader size={16} color="white" style={styles.spinning} />
                  ) : (
                    <View style={styles.stepDot} />
                  )}
                </View>
                <Text style={[
                  styles.stepText,
                  index <= currentStep && styles.stepTextActive
                ]}>
                  {step}
                </Text>
              </View>
            ))}
          </View>

          {isComplete && (
            <View style={styles.featuresContainer}>
              <View style={styles.featureItem}>
                <Target size={24} color="white" />
                <Text style={styles.featureText}>Your Goals</Text>
              </View>
              <View style={styles.featureItem}>
                <Heart size={24} color="white" />
                <Text style={styles.featureText}>Health Tracking</Text>
              </View>
              <View style={styles.featureItem}>
                <Activity size={24} color="white" />
                <Text style={styles.featureText}>Smart Insights</Text>
              </View>
            </View>
          )}

          {isComplete && (
            <TouchableOpacity style={styles.startButton} onPress={handleComplete}>
              <Text style={styles.startButtonText}>Let's check it out!</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
  },
  stepsContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 48,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIconActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  stepIconCurrent: {
    backgroundColor: 'white',
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  spinning: {
    transform: [{ rotate: '45deg' }],
  },
  stepText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    flex: 1,
  },
  stepTextActive: {
    color: 'white',
    fontFamily: 'Inter-SemiBold',
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 30,
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'white',
  },
  startButton: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  startButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: Colors.primary,
  },
});