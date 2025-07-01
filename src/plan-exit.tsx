import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { ArrowLeft, Gift, Sparkles, Clock, TrendingDown } from 'lucide-react-native';
import { useStripe } from '@/hooks/useStripe';
import { stripeProducts } from '@/src/stripe-config';

const { width } = Dimensions.get('window');

export default function PlanExitScreen() {
  const { redirectToCheckout, isLoading } = useStripe();

  const handleClaimOffer = async () => {
    try {
      const product = stripeProducts[0]; // Get the main subscription product
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const defaultSuccessUrl = `${baseUrl}/subscription/success`;
      const defaultCancelUrl = `${baseUrl}/subscription/cancel`;
      
      console.log('Starting checkout process with:', {
        priceId: product.priceId,
        mode: 'subscription',
        successUrl: defaultSuccessUrl,
        cancelUrl: defaultCancelUrl,
      });
      
      await redirectToCheckout({
        priceId: product.priceId,
        mode: 'subscription',
        successUrl: defaultSuccessUrl,
        cancelUrl: defaultCancelUrl,
      });
    } catch (err) {
      console.error('Checkout error:', err);
      Alert.alert('Error', `Failed to start checkout process: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleContinueWithoutOffer = async () => {
    try {
      const product = stripeProducts[0]; // Get the main subscription product
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const defaultSuccessUrl = `${baseUrl}/subscription/success`;
      const defaultCancelUrl = `${baseUrl}/subscription/cancel`;
      
      console.log('Starting checkout process with:', {
        priceId: product.priceId,
        mode: 'subscription',
        successUrl: defaultSuccessUrl,
        cancelUrl: defaultCancelUrl,
      });
      
      await redirectToCheckout({
        priceId: product.priceId,
        mode: 'subscription',
        successUrl: defaultSuccessUrl,
        cancelUrl: defaultCancelUrl,
      });
    } catch (err) {
      console.error('Checkout error:', err);
      Alert.alert('Error', `Failed to start checkout process: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
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
          <Text style={styles.title}>One Time Offer</Text>
          <Text style={styles.subtitle}>You will never see this again</Text>
        </View>

        <View style={styles.offerContainer}>
          <LinearGradient
            colors={['#f8fafc', '#e2e8f0']}
            style={styles.offerCard}
          >
            <View style={styles.giftContainer}>
              <Gift size={48} color={Colors.primary} />
              <Sparkles size={24} color={Colors.warning} style={styles.sparkle1} />
              <Sparkles size={16} color={Colors.success} style={styles.sparkle2} />
            </View>
            
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>Here's a 25% OFF discount 🎁</Text>
            </View>
            
            <View style={styles.priceContainer}>
              <Text style={styles.originalPrice}>$23.99</Text>
              <View style={styles.newPriceContainer}>
                <Text style={styles.newPrice}>Only $1.49</Text>
                <Text style={styles.priceUnit}>/ month</Text>
              </View>
            </View>

            <View style={styles.urgencyContainer}>
              <Clock size={16} color={Colors.error} />
              <Text style={styles.urgencyText}>Limited time offer</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.comparisonContainer}>
          <View style={styles.comparisonItem}>
            <TrendingDown size={20} color={Colors.success} />
            <Text style={styles.comparisonText}>$6 discount</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.claimButton, isLoading && styles.claimButtonDisabled]} 
          onPress={handleClaimOffer}
          disabled={isLoading}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.claimButtonGradient}
          >
            <Text style={styles.claimButtonText}>
              {isLoading ? 'Processing...' : 'Claim your limited offer now!'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.pricingInfo}>
          <Text style={styles.yearlyPrice}>$23.99/year</Text>
        </View>

        <TouchableOpacity 
          onPress={handleContinueWithoutOffer}
          disabled={isLoading}
        >
          <Text style={[styles.skipText, isLoading && styles.skipTextDisabled]}>
            {isLoading ? 'Processing...' : 'Continue without offer'}
          </Text>
        </TouchableOpacity>
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
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: Colors.textSecondary,
  },
  offerContainer: {
    marginBottom: 32,
  },
  offerCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
  },
  giftContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  sparkle1: {
    position: 'absolute',
    top: -8,
    right: -12,
  },
  sparkle2: {
    position: 'absolute',
    bottom: -4,
    left: -8,
  },
  discountBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  discountText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  originalPrice: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
    marginBottom: 8,
  },
  newPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  newPrice: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: Colors.text,
  },
  priceUnit: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  urgencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  urgencyText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.error,
  },
  benefitsContainer: {
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: Colors.text,
    marginBottom: 16,
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  benefitText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: Colors.text,
    flex: 1,
  },
  comparisonContainer: {
    alignItems: 'center',
  },
  comparisonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${Colors.success}15`,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  comparisonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.success,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  claimButton: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  claimButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  claimButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
  pricingInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  yearlyPrice: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.text,
    marginBottom: 4,
  },
  savingsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: Colors.success,
    textAlign: 'center',
    lineHeight: 16,
  },
  skipText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.textSecondary,
  },
  claimButtonDisabled: {
    opacity: 0.6,
  },
  skipTextDisabled: {
    color: Colors.textSecondary,
    opacity: 0.6,
  },
});