import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, Image, TextInput, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/Colors';
import { useFoodScans, useActivities, useGlucoseReadings, useAIConversations } from '@/hooks/useSupabaseData';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { gptVisionService } from '@/services/gptVisionService';
import { deepseekService } from '@/services/deepSeekService';
import { analytics } from '@/services/analytics';
import { router } from 'expo-router';
import { Send, Bot, Clock, Activity, Utensils, TrendingUp, TrendingDown, CircleAlert as AlertCircle, Heart, Droplets, Zap, Camera, X, FlipHorizontal, CircleCheck as CheckCircle, Loader, Mic, RotateCcw, Copy, ThumbsUp, ThumbsDown, Share, MessageCircle, Calculator, Stethoscope, Sparkles, Menu, User, FileText, Shield, Settings, ChevronRight, Target, Calendar, Flame, Award, Plus, ChevronDown, Bell } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ActivityModal from '@/components/ActivityModal';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { PanGestureHandler } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  foodAnalysis?: FoodAnalysis;
  isLoading?: boolean;
}

interface SmartSuggestion {
  id: string;
  text: string;
  category: 'glucose' | 'meal' | 'activity' | 'insulin' | 'emergency';
  icon: any;
  color: string;
  priority: number;
}

interface FoodAnalysis {
  foodName: string;
  portionSize: string;
  nutrition: {
    calories: number;
    carbohydrates: number;
    protein: number;
    fat: number;
    fiber: number;
  };
  insulinRecommendation: {
    units: number;
    reasoning: string;
  };
  confidence: number;
}

export default function MainScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isOnboardingComplete, isLoading: userLoading } = useUser();
  const [chatState, setChatState] = useState<{
    messages: Message[];
    inputText: string;
    isTyping: boolean;
    animatedBotMessage: string | null;
  }>({
    messages: [],
    inputText: '',
    isTyping: false,
    animatedBotMessage: null
  });
  const [currentSuggestions, setCurrentSuggestions] = useState<SmartSuggestion[]>([]);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  
  // Camera states
  const [cameraState, setCameraState] = useState({
    showCamera: false,
    facing: 'back' as CameraType,
    capturedImage: null as string | null,
    isAnalyzing: false,
    analysisError: null as string | null
  });
  const [permission, requestPermission] = useCameraPermissions();
  const [recoveryOptions, setRecoveryOptions] = useState<string[]>([]);
  const cameraRef = useRef<CameraView>(null);

  // Photo selection states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  // Animation for dashboard and settings
  const dashboardAnimation = useRef(new Animated.Value(-width)).current;
  const settingsAnimation = useRef(new Animated.Value(width)).current;
  const opacityAnimation = useRef(new Animated.Value(1)).current;

  // Component mounted status ref to prevent state updates on unmounted component
  const isMounted = useRef(true);
  const typingInterval = useRef<number | null>(null);

  // Supabase hooks
  const { addFoodScan } = useFoodScans();
  const { conversations, addMessage, isLoading: conversationsLoading } = useAIConversations();
  const { foodScans } = useFoodScans();
  const { activities } = useActivities();
  const { glucoseReadings } = useGlucoseReadings();

  // Typing animation state for bot message
  const [animatedBotMessage, setAnimatedBotMessage] = useState<string | null>(null);

  // Implement conversation pagination and search
  const [conversationState, setConversationState] = useState<{
    messages: Message[];
    hasMore: boolean;
    isLoading: boolean;
    searchQuery: string;
  }>({
    messages: [],
    hasMore: true,
    isLoading: false,
    searchQuery: ''
  });

  // Check authentication and onboarding
  useEffect(() => {
    if (authLoading || userLoading) return;

    if (!user) {
      router.replace('/auth');
      return;
    }
    
    // Only check onboarding status after user profile has finished loading
    if (!userLoading && !isOnboardingComplete) {
      router.replace('/onboarding/goals');
      return;
    }
  }, [user, isOnboardingComplete, authLoading, userLoading]);

  // Cleanup function to set mounted status to false
  useEffect(() => {
    return () => {
      // Clear any pending animations
      if (typingInterval.current) {
        clearInterval(typingInterval.current);
        typingInterval.current = null;
      }
      // Clear mounted flag
      isMounted.current = false;
    };
  }, []);

  // Load conversations from Supabase
  useEffect(() => {
    if (!isMounted.current) return;

    if (!conversationsLoading && conversations.length > 0) {
      const loadedMessages: Message[] = conversations.map(conv => ({
        id: conv.id,
        text: conv.message_text,
        isBot: conv.is_bot_message,
        timestamp: new Date(conv.created_at),
      }));
      if (isMounted.current) {
        setChatState(prev => ({ ...prev, messages: loadedMessages }));
      }
    } else if (!conversationsLoading && conversations.length === 0) {
      // Set initial welcome message if no conversations exist
      const welcomeMessage: Message = {
        id: 'welcome',
        text: "Hi! I'm CarbIQ ",
        isBot: true,
        timestamp: new Date(),
      };
      if (isMounted.current) {
        setChatState(prev => ({ ...prev, messages: [welcomeMessage] }));
      }
    }
  }, [conversations, conversationsLoading]);

  // Smart suggestions
  const allSuggestions: SmartSuggestion[] = [
    // Quick glucose checks
    {
      id: 'glucose-check',
      text: "My glucose is 142 mg/dL",
      category: 'glucose',
      icon: Droplets,
      color: Colors.primary,
      priority: 9,
    },
    {
      id: 'pre-meal-glucose',
      text: "Pre-meal glucose: 98 mg/dL",
      category: 'glucose',
      icon: Clock,
      color: Colors.success,
      priority: 8,
    },
    // Meal planning
    {
      id: 'meal-plan',
      text: "Give me a dinner plan",
      category: 'meal',
      icon: Utensils,
      color: Colors.warning,
      priority: 7,
    },
    {
      id: 'carb-count',
      text: "How many carbs in this meal?",
      category: 'meal',
      icon: Calculator,
      color: Colors.secondary,
      priority: 6,
    },
    // Activity tracking
    {
      id: 'exercise-plan',
      text: "Best exercises for diabetes",
      category: 'activity',
      icon: Activity,
      color: Colors.success,
      priority: 5,
    },
    // Insulin management
    {
      id: 'insulin-calc',
      text: "Calculate my insulin dose",
      category: 'insulin',
      icon: Zap,
      color: Colors.primary,
      priority: 8,
    },
    // Emergency situations
    {
      id: 'low-glucose',
      text: "I'm feeling low, glucose is 65",
      category: 'emergency',
      icon: AlertCircle,
      color: Colors.error,
      priority: 10,
    },
    {
      id: 'high-glucose',
      text: "High glucose: 280 mg/dL",
      category: 'emergency',
      icon: TrendingUp,
      color: Colors.error,
      priority: 10,
    },
  ];

  // Update suggestions
  useEffect(() => {
    if (!isMounted.current) return;
    
    const sortedSuggestions = allSuggestions
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 2);
    
    if (isMounted.current) {
      setCurrentSuggestions(sortedSuggestions);
    }
  }, []);

  // 1. Show all smart suggestions
  useEffect(() => {
    if (!isMounted.current) return;
    // Show all suggestions, not just top 2
    setCurrentSuggestions(allSuggestions.sort((a, b) => b.priority - a.priority));
  }, []);

  const toggleDashboard = () => {
    const toValue = showDashboard ? -width : 0;
    const opacityValue = showDashboard ? 1 : 0.3;
    
    setShowDashboard(!showDashboard);
    
    Animated.parallel([
      Animated.timing(dashboardAnimation, {
        toValue,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnimation, {
        toValue: opacityValue,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  const toggleSettings = () => {
    const toValue = showSettings ? width : 0;
    const opacityValue = showSettings ? 1 : 0.3;
    
    setShowSettings(!showSettings);
    
    Animated.parallel([
      Animated.timing(settingsAnimation, {
        toValue,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnimation, {
        toValue: opacityValue,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  // Calculate today's data for dashboard
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayFoodScans = foodScans.filter(scan => {
    const scanDate = new Date(scan.created_at);
    scanDate.setHours(0, 0, 0, 0);
    return scanDate.getTime() === today.getTime();
  });

  const todayActivities = activities.filter(activity => {
    const activityDate = new Date(activity.created_at);
    activityDate.setHours(0, 0, 0, 0);
    return activityDate.getTime() === today.getTime();
  });

  const latestGlucose = glucoseReadings.length > 0 ? glucoseReadings[0] : null;

  // Calculate daily stats
  const dailyStats = {
    glucose: latestGlucose ? latestGlucose.reading : 142,
    carbs: todayFoodScans.reduce((sum, scan) => sum + scan.carbohydrates, 0),
    carbsTarget: 150,
    calories: todayFoodScans.reduce((sum, scan) => sum + scan.calories, 0),
    caloriesTarget: 1800,
    caloriesBurned: todayActivities.reduce((sum, activity) => sum + activity.calories_burned, 0),
    activeMinutes: todayActivities.reduce((sum, activity) => sum + activity.duration_minutes, 0),
    foodsScanned: todayFoodScans.length,
    protein: todayFoodScans.reduce((sum, scan) => sum + scan.protein, 0),
    proteinTarget: 120,
    fat: todayFoodScans.reduce((sum, scan) => sum + scan.fat, 0),
    fatTarget: 60,
  };

  // Typing animation function for bot message
  const animateBotMessage = (fullText: string, onComplete: () => void) => {
    setAnimatedBotMessage('');
    let i = 0;
    typingInterval.current = setInterval(() => {
      setAnimatedBotMessage((prev) => (prev ?? '') + fullText[i]);
      i++;
      if (i >= fullText.length) {
        if (typingInterval.current) {
          clearInterval(typingInterval.current);
          typingInterval.current = null;
        }
        onComplete();
      }
    }, 18); // Adjust speed as desired
  };

  const sendMessage = async (text?: string, foodAnalysis?: FoodAnalysis, imageBase64?: string) => {
    if (!isMounted.current) return;

    const messageText = text || chatState.inputText.trim();
    if (!messageText && !selectedImage && !foodAnalysis) return;

    setChatState(prev => ({ ...prev, isTyping: true }));

    // Track message sent
    trackUserInteraction('message_sent', { 
      hasImage: !!selectedImage, 
      hasFoodAnalysis: !!foodAnalysis,
      messageLength: messageText.length 
    });

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText || (selectedImage ? "I'm sharing a photo" : ""),
      isBot: false,
      timestamp: new Date(),
    };

    if (isMounted.current) {
      setChatState(prev => ({ ...prev, messages: [...prev.messages, userMessage], inputText: '' }));
      setSelectedImage(null); // Clear selected image after sending
    }

    // Save user message to Supabase
    await addMessage({
      message_text: messageText || (selectedImage ? "I'm sharing a photo" : ""),
      is_bot_message: false,
    });

    try {
      // Prepare conversation history for AI
      const conversationHistory = chatState.messages.slice(-10).map(msg => ({
        role: msg.isBot ? 'assistant' as const : 'user' as const,
        content: msg.text
      }));

      // Call Deepseek API for response
      const botResponse = await deepseekService.sendMessage(
        messageText,
        profile ? {
          age: profile.age,
          gender: profile.gender,
          activityLevel: profile.activityLevel,
          insulinType: profile.insulinType,
          carbRatio: profile.carbRatio,
          correctionFactor: profile.correctionFactor,
          basalRate: profile.basalRate,
        } : undefined,
        conversationHistory
      );

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        isBot: true,
        timestamp: new Date(),
      };

      if (isMounted.current) {
        setChatState(prev => ({ ...prev, isTyping: true, animatedBotMessage: '' }));
        animateBotMessage(botResponse, () => {
          setChatState(prev => ({ ...prev, messages: [...prev.messages, botMessage], animatedBotMessage: null, isTyping: false }));
        });
      }

      // Track AI response received
      trackUserInteraction('ai_response_received', { 
        responseLength: botResponse.length,
        conversationHistoryLength: conversationHistory.length 
      });

      // Save bot message to Supabase
      await addMessage({
        message_text: botResponse,
        is_bot_message: true,
      });
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Track AI response error
      trackUserInteraction('ai_response_error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I apologize, but I'm having trouble connecting right now. Please try again in a moment. In the meantime, remember to monitor your glucose levels and consult your healthcare provider for any urgent concerns.",
        isBot: true,
        timestamp: new Date(),
      };

      if (isMounted.current) {
        setChatState(prev => ({ ...prev, messages: [...prev.messages, errorMessage], isTyping: false, animatedBotMessage: null }));
      }
    }
  };

  const saveFoodScanToSupabase = async (foodAnalysis: FoodAnalysis): Promise<string | null> => {
    const foodScan = await addFoodScan({
      food_name: foodAnalysis.foodName,
      carbohydrates: foodAnalysis.nutrition.carbohydrates,
      calories: foodAnalysis.nutrition.calories,
      protein: foodAnalysis.nutrition.protein,
      fat: foodAnalysis.nutrition.fat,
      fiber: foodAnalysis.nutrition.fiber,
      portion_size: foodAnalysis.portionSize,
      confidence: foodAnalysis.confidence,
    });

    return foodScan?.id || null;
  };

  // 2. When a suggestion is pressed, set inputText and focus input
  const inputRef = useRef<TextInput>(null);
  const handleSuggestionPress = (suggestion: SmartSuggestion) => {
    if (!isMounted.current) return;
    setChatState(prev => ({ ...prev, inputText: suggestion.text }));
    // Focus the input box
    inputRef.current?.focus();
    // Track suggestion used
    trackUserInteraction('suggestion_used', { 
      suggestionId: suggestion.id,
      suggestionText: suggestion.text,
      category: suggestion.category 
    });
  };

  // Camera functions
  const openCamera = () => {
    if (!permission?.granted) {
      requestPermission();
      return;
    }
    if (isMounted.current) {
      setCameraState(prev => ({ ...prev, showCamera: true, analysisError: null }));
      setRecoveryOptions([]);
      
      // Track camera opened
      trackUserInteraction('camera_opened', {});
    }
  };

  const closeCamera = () => {
    if (isMounted.current) {
      setCameraState(prev => ({ ...prev, showCamera: false, capturedImage: null, isAnalyzing: false, analysisError: null }));
      setRecoveryOptions([]);
      
      // Track camera closed
      trackUserInteraction('camera_closed', {});
    }
  };

  const toggleCameraFacing = () => {
    if (isMounted.current) {
      setCameraState(prev => ({ 
        ...prev, 
        facing: prev.facing === 'back' ? 'front' : 'back' 
      }));
      
      // Track camera facing changed
      trackUserInteraction('camera_facing_changed', { 
        newFacing: cameraState.facing === 'back' ? 'front' : 'back' 
      });
    }
  };

  const takePicture = async () => {
    if (cameraRef.current && isMounted.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        if (photo && isMounted.current) {
          setCameraState(prev => ({ ...prev, capturedImage: photo.uri }));
          
          // Track photo taken
          trackUserInteraction('photo_taken', { 
            photoUri: photo.uri 
          });
          
          analyzeFood(photo.uri);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
        
        // Track photo error
        trackUserInteraction('photo_error', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
  };

  const analyzeFood = async (imageUri: string) => {
    if (!isMounted.current) return;
    setCameraState(prev => ({ ...prev, isAnalyzing: true, analysisError: null }));
    setRecoveryOptions([]);
    trackUserInteraction('food_analysis_started', { imageUri });
    try {
      // Step 1: Get food labels from Vision API
      const foodLabels = await gptVisionService.analyzeFoodImage(imageUri);
      if (foodLabels.length === 0) {
        // No food detected: send animated bot message
        await sendMessage(
          "I couldn't detect any food in your image. Please try again with a clearer photo of your meal.",
          undefined,
          undefined
        );
        if (isMounted.current) {
          setCameraState(prev => ({ ...prev, isAnalyzing: false }));
          handleAnalysisError(new Error('No food items detected in the image. Please try with a clearer photo of food.'));
        }
        return;
      }
      // Step 2: Get base64 image for Deepseek analysis
      const imageBase64 = await gptVisionService.getImageBase64(imageUri);
      // Step 3: Analyze food with Deepseek API
      const foodAnalysis = await deepseekService.analyzeFood(
        foodLabels.map(label => label.name),
        profile ? {
          age: profile.age,
          gender: profile.gender,
          activityLevel: profile.activityLevel,
          insulinType: profile.insulinType,
          carbRatio: profile.carbRatio,
          correctionFactor: profile.correctionFactor,
          basalRate: profile.basalRate,
        } : undefined
      );
      // Step 4: Save to Supabase
      const foodScanId = await saveFoodScanToSupabase(foodAnalysis);
      trackUserInteraction('food_analysis_completed', { 
        foodName: foodAnalysis.foodName,
        confidence: foodAnalysis.confidence,
        foodScanId 
      });
      // Step 5: Send message with analysis results
      const analysisMessage = `I've analyzed your food! Here's what I found:\n\n🍽️ **${foodAnalysis.foodName}**\n📏 Portion: ${foodAnalysis.portionSize}\n\n**Nutrition:**\n• Calories: ${foodAnalysis.nutrition.calories} cal\n• Carbs: ${foodAnalysis.nutrition.carbohydrates}g\n• Protein: ${foodAnalysis.nutrition.protein}g\n• Fat: ${foodAnalysis.nutrition.fat}g\n• Fiber: ${foodAnalysis.nutrition.fiber}g\n\n💉 **Insulin Recommendation:** ${foodAnalysis.insulinRecommendation.units} units\n💭 **Reasoning:** ${foodAnalysis.insulinRecommendation.reasoning}\n\nConfidence: ${Math.round(foodAnalysis.confidence * 100)}%`;
      await sendMessage(analysisMessage, foodAnalysis, imageBase64);
      if (isMounted.current) {
        setCameraState(prev => ({ ...prev, capturedImage: null, isAnalyzing: false }));
        closeCamera();
      }
    } catch (error) {
      console.error('Error analyzing food:', error);
      trackUserInteraction('food_analysis_error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      // Always send an animated bot message for errors
      await sendMessage(
        error instanceof Error
          ? `Sorry, I couldn't analyze your image: ${error.message}`
          : 'Sorry, something went wrong while analyzing your image.',
        undefined,
        undefined
      );
      if (isMounted.current) {
        setCameraState(prev => ({ ...prev, isAnalyzing: false }));
        handleAnalysisError(error as Error);
      }
    }
  };

  const retryAnalysis = () => {
    if (cameraState.capturedImage) {
      analyzeFood(cameraState.capturedImage);
    }
  };

  // Photo selection functions
  const requestMediaLibraryPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to select photos.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  const requestCameraPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera permissions to take photos.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  const selectFromGallery = async () => {
    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setShowPhotoOptions(false);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image from gallery.');
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setShowPhotoOptions(false);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo.');
    }
  };

  const showPhotoActionSheet = () => {
    setShowPhotoOptions(true);
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
  };

  // Improve error messages and recovery options
  const handleAnalysisError = (error: Error) => {
    let errorMessage = 'Analysis failed. Please try again.';
    let recoveryOptions: string[] = ['retry', 'take_new_photo'];

    if (error.message.includes('No food items detected')) {
      errorMessage = 'No food items found. Try taking a clearer photo.';
      recoveryOptions = ['retry', 'take_new_photo', 'adjust_lighting'];
    } else if (error.message.includes('Invalid image format')) {
      errorMessage = 'Image format not supported. Please use JPEG or PNG.';
      recoveryOptions = ['take_new_photo'];
    } else if (error.message.includes('Image file too large')) {
      errorMessage = 'Image is too large. Please try with a smaller image.';
      recoveryOptions = ['take_new_photo'];
    } else if (error.message.includes('API quota exceeded') || error.message.includes('rate limit')) {
      errorMessage = 'Service temporarily unavailable. Please try again later.';
      recoveryOptions = ['retry'];
    } else if (error.message.includes('network') || error.message.includes('connection')) {
      errorMessage = 'Connection issue. Please check your internet and try again.';
      recoveryOptions = ['retry', 'take_new_photo'];
    } else if (error.message.includes('Invalid API key')) {
      errorMessage = 'Service configuration error. Please contact support.';
      recoveryOptions = ['take_new_photo'];
    }
    
    setCameraState(prev => ({ ...prev, analysisError: errorMessage }));
    setRecoveryOptions(recoveryOptions);
  };

  // Implement offline support and sync
  const syncData = async () => {
    // TODO: Implement offline data sync when needed
    console.log('Offline sync not yet implemented');
  };

  // Implement data anonymization for analytics
  const anonymizeData = (data: any) => {
    // TODO: Implement data anonymization when analytics are added
    return {
      ...data,
      userId: 'anonymous',
      personalInfo: 'removed'
    };
  };

  // Track user interactions for optimization
  const trackUserInteraction = (action: string, context: any) => {
    analytics.track('user_interaction', {
      action,
      context,
      timestamp: Date.now(),
      sessionId: analytics.getSessionId()
    });
  };

  // Show loading screen while checking auth/onboarding
  if (authLoading || userLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Heart size={60} color={Colors.primary} />
          <Text style={styles.loadingText}>CarbIQ</Text>
          <Text style={styles.loadingSubtext}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Camera UI
  if (cameraState.showCamera) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.cameraHeader}>
          <TouchableOpacity style={styles.cameraHeaderButton} onPress={closeCamera}>
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.cameraHeaderTitle}>Scan Food</Text>
          <TouchableOpacity style={styles.cameraHeaderButton} onPress={toggleCameraFacing}>
            <FlipHorizontal size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {cameraState.capturedImage ? (
          <ScrollView style={styles.analysisContainer}>
            <Image source={{ uri: cameraState.capturedImage }} style={styles.capturedImage} />
            
            {cameraState.isAnalyzing && (
              <View style={styles.loadingContainer}>
                <Loader size={32} color={Colors.primary} style={styles.spinningLoader} />
                <Text style={styles.loadingText}>Analyzing your food...</Text>
                <Text style={styles.loadingSubtext}>Using AI to identify ingredients and calculate nutrition</Text>
              </View>
            )}

            {cameraState.analysisError && (
              <View style={styles.errorContainer}>
                <AlertCircle size={32} color={Colors.error} />
                <Text style={styles.errorText}>{cameraState.analysisError}</Text>
                
                <View style={styles.recoveryOptionsContainer}>
                  {recoveryOptions.includes('retry') && (
                    <TouchableOpacity style={styles.retryButton} onPress={retryAnalysis}>
                      <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                  )}
                  
                  {recoveryOptions.includes('take_new_photo') && (
                    <TouchableOpacity style={styles.backButton} onPress={closeCamera}>
                      <Text style={styles.backButtonText}>Take New Photo</Text>
                    </TouchableOpacity>
                  )}
                  
                  {recoveryOptions.includes('adjust_lighting') && (
                    <TouchableOpacity style={styles.lightingButton} onPress={() => {
                      setCameraState(prev => ({ ...prev, analysisError: null }));
                      setRecoveryOptions([]);
                    }}>
                      <Text style={styles.lightingButtonText}>Adjust Lighting</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={styles.cameraContainer}>
            <CameraView ref={cameraRef} style={styles.camera} facing={cameraState.facing}>
              <View style={styles.cameraOverlay}>
                <View style={styles.scanFrame} />
                <Text style={styles.scanInstructions}>
                  Position your food within the frame
                </Text>
              </View>
            </CameraView>
          </View>
        )} 
        
        {!cameraState.capturedImage && !cameraState.isAnalyzing && (
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePicture}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
            <Text style={styles.captureInstructions}>
              Tap to capture and analyze your food
            </Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Main Chat Interface with Opacity Animation */}
      <Animated.View style={[styles.mainContent, { opacity: opacityAnimation }]}>
        {/* Header */}
        <LinearGradient
          colors={['#456afc', '#2948ff']}
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.menuButton} onPress={toggleDashboard}>
              <Menu size={24} color={"white"} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>CarbIQ</Text>
            <TouchableOpacity style={styles.settingsButton} onPress={toggleSettings}>
              <Settings size={24} color={"white"} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <KeyboardAvoidingView 
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Messages */}
          <ScrollView 
            style={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesContent}
          >
            {chatState.messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageContainer,
                  message.isBot ? styles.botMessageContainer : styles.userMessageContainer,
                ]}
              >
                {message.foodAnalysis && (
                  <View style={styles.foodAnalysisCard}>
                    <Text style={styles.foodAnalysisTitle}>{message.foodAnalysis.foodName}</Text>
                    <View style={styles.nutritionRow}>
                      <Text style={styles.nutritionItem}>{message.foodAnalysis.nutrition.carbohydrates}g carbs</Text>
                      <Text style={styles.nutritionItem}>{message.foodAnalysis.nutrition.calories} cal</Text>
                      <Text style={styles.nutritionItem}>{message.foodAnalysis.nutrition.protein}g protein</Text>
                    </View>
                    <View style={styles.insulinRecommendation}>
                      <Text style={styles.insulinUnits}>{message.foodAnalysis.insulinRecommendation.units} units</Text>
                      <Text style={styles.insulinLabel}>recommended</Text>
                    </View>
                    <View style={styles.confidenceIndicator}>
                      <Text style={styles.confidenceText}>
                        {Math.round(message.foodAnalysis.confidence * 100)}% confidence
                      </Text>
                    </View>
                  </View>
                )}
                
                <View
                  style={[
                    styles.messageBubble,
                    message.isBot ? styles.botMessageBubble : styles.userMessageBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      message.isBot ? styles.botMessageText : styles.userMessageText,
                    ]}
                  >
                    {message.text}
                  </Text>
                </View>
                
                <Text style={styles.messageTime}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))}

            {/* Animated bot message with typing effect */}
            {chatState.animatedBotMessage && (
              <View style={[styles.messageContainer, styles.botMessageContainer]}>
                <View style={[styles.messageBubble, styles.botMessageBubble]}>
                  <Text style={[styles.messageText, styles.botMessageText]}>
                    {chatState.animatedBotMessage}
                    <Text style={{ opacity: 0.5 }}>|</Text>
                  </Text>
                </View>
                <Text style={styles.messageTime}>
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
            {/* Only show typing bubble if not animating */}
            {chatState.isTyping && !chatState.animatedBotMessage && (
              <View style={styles.typingContainer}>
                <View style={styles.typingBubble}>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Smart Suggestions */}
          {currentSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestionsScroll}
              >
                {currentSuggestions.map((suggestion) => {
                  const IconComponent = suggestion.icon;
                  return (
                    <TouchableOpacity
                      key={suggestion.id}
                      style={[styles.suggestionChip, { borderColor: suggestion.color }]}
                      onPress={() => handleSuggestionPress(suggestion)}
                    >
                      <IconComponent size={16} color={suggestion.color} />
                      <Text style={[styles.suggestionText, { color: suggestion.color }]}>
                        {suggestion.text.length > 25 
                          ? suggestion.text.substring(0, 25) + '...' 
                          : suggestion.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Input Area */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TouchableOpacity
                style={styles.plusButton}
                onPress={showPhotoActionSheet}
              >
                <Plus size={20} color={Colors.primary} />
              </TouchableOpacity>
              
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                placeholder="Ask anything"
                value={chatState.inputText}
                onChangeText={(text) => setChatState(prev => ({ ...prev, inputText: text }))}
                multiline
                maxLength={500}
                placeholderTextColor={Colors.textSecondary}
              />
              
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (chatState.inputText.trim() || selectedImage) ? styles.sendButtonActive : styles.sendButtonInactive,
                ]}
                onPress={() => sendMessage()}
                disabled={!chatState.inputText.trim() && !selectedImage}
              >
                <Send 
                  size={20} 
                  color={(chatState.inputText.trim() || selectedImage) ? 'white' : Colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
            
            {/* Image Preview */}
            {selectedImage && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeImageButton} onPress={clearSelectedImage}>
                  <X size={16} color="white" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Animated.View>

      {/* Dashboard Overlay */}
      <Animated.View 
        style={[
          styles.dashboardOverlay,
          {
            transform: [{
              translateX: dashboardAnimation
            }]
          }
        ]}
      >
        <LinearGradient
          colors={['#456afc', '#2948ff']}
          style={styles.dashboardContainer}
        >
          {/* Dashboard Header - Seamless with gradient */}
          <View style={styles.dashboardHeader}>
            <TouchableOpacity style={styles.dashboardCloseButton} onPress={toggleDashboard}>
              <X size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.dashboardHeaderTitle}>Dashboard</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.dashboardScrollContent}>
            {/* Main Glucose Circle - Lifesum Style */}
            <View style={styles.mainCircleContainer}>
              {/* Side Stats */}
              <View style={styles.leftStat}>
                <Text style={styles.sideStatValue}>{dailyStats.calories}</Text>
                <Text style={styles.sideStatLabel}>EATEN</Text>
              </View>

              {/* Central Glucose Circle */}
              <View style={styles.centralCircle}>
                <View style={styles.glucoseCircle}>
                  <Text style={styles.glucoseValue}>{dailyStats.glucose}</Text>
                  <Text style={styles.glucoseUnit}>mg/dL</Text>
                  <Text style={styles.glucoseLabel}>GLUCOSE</Text>
                </View>
              </View>

              {/* Right Side Stats */}
              <View style={styles.rightStat}>
                <Text style={styles.sideStatValue}>{dailyStats.caloriesBurned}</Text>
                <Text style={styles.sideStatLabel}>BURNED</Text>
              </View>
            </View>

            {/* Macros Breakdown - Lifesum Style */}
            <View style={styles.macrosSection}>
              <View style={styles.macroRow}>
                <Text style={styles.macroLabel}>CARBS</Text>
                <Text style={styles.macroLabel}>PROTEIN</Text>
                <Text style={styles.macroLabel}>FAT</Text>
              </View>
              <View style={styles.macroValues}>
                <View style={styles.macroItem}>
                  <View style={styles.macroBar}>
                    <View style={[
                      styles.macroProgress, 
                      { 
                        width: `${Math.min(100, (dailyStats.carbs / dailyStats.carbsTarget) * 100)}%`,
                        backgroundColor: 'rgba(255, 255, 255, 0.9)'
                      }
                    ]} />
                  </View>
                  <Text style={styles.macroValue}>{dailyStats.carbs} / {dailyStats.carbsTarget}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <View style={styles.macroBar}>
                    <View style={[
                      styles.macroProgress, 
                      { 
                        width: `${Math.min(100, (dailyStats.protein / dailyStats.proteinTarget) * 100)}%`,
                        backgroundColor: 'rgba(255, 255, 255, 0.9)'
                      }
                    ]} />
                  </View>
                  <Text style={styles.macroValue}>{dailyStats.protein} / {dailyStats.proteinTarget}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <View style={styles.macroBar}>
                    <View style={[
                      styles.macroProgress, 
                      { 
                        width: `${Math.min(100, (dailyStats.fat / dailyStats.fatTarget) * 100)}%`,
                        backgroundColor: 'rgba(255, 255, 255, 0.9)'
                      }
                    ]} />
                  </View>
                  <Text style={styles.macroValue}>{dailyStats.fat} / {dailyStats.fatTarget}g</Text>
                </View>
              </View>
            </View>

            {/* Curved Bottom */}
            <View style={styles.curvedBottom}>
              <ChevronDown size={24} color="rgba(255, 255, 255, 0.7)" />
            </View>

            {/* White Content Area */}
            <View style={styles.whiteContentArea}>
              {/* Date Navigation */}
              <View style={styles.dateNavigation}>
                <TouchableOpacity>
                  <ChevronRight size={20} color={Colors.textSecondary} style={{ transform: [{ rotate: '180deg' }] }} />
                </TouchableOpacity>
                <View style={styles.dateContainer}>
                  <Calendar size={16} color={Colors.textSecondary} />
                  <Text style={styles.dateText}>
                    Today, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <TouchableOpacity>
                  <ChevronRight size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Quick Actions */}
              <View style={styles.section}>
                <View style={styles.quickActions}>
                  <TouchableOpacity 
                    style={styles.quickAction}
                    onPress={() => {
                      toggleDashboard();
                      openCamera();
                    }}
                  >
                    <LinearGradient
                      colors={['#159957', '#155799']}
                      style={styles.quickActionGradient}
                    >
                      <Utensils size={24} color="white" />
                    </LinearGradient>
                    <Text style={styles.quickActionText}>Scan Food</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.quickAction}
                    onPress={() => setShowActivityModal(true)}
                  >
                    <LinearGradient
                      colors={['#ee0979', '#ff6a00']}
                      style={styles.quickActionGradient}
                    >
                      <Activity size={24} color="white" />
                    </LinearGradient>
                    <Text style={styles.quickActionText}>Add Activity</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.quickAction}
                    onPress={() => {
                      toggleDashboard();
                      router.push('/history-log');
                    }}
                  >
                    <LinearGradient
                      colors={['#642B73', '#C6426E']}
                      style={styles.quickActionGradient}
                    >
                      <Zap size={24} color="white" />
                    </LinearGradient>
                    <Text style={styles.quickActionText}>History Log</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Today's Summary */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Today's Summary</Text>
                  <Text style={styles.sectionDate}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
                </View>
                
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryIcon}>
                      <Heart size={20} color={Colors.error} />
                    </View>
                    <Text style={styles.summaryValue}>{dailyStats.glucose}</Text>
                    <Text style={styles.summaryLabel}>Glucose</Text>
                    <Text style={styles.summaryStatus}>In Range</Text>
                  </View>
                  
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryIcon}>
                      <Utensils size={20} color={Colors.primary} />
                    </View>
                    <Text style={styles.summaryValue}>{dailyStats.foodsScanned}</Text>
                    <Text style={styles.summaryLabel}>Foods Scanned</Text>
                    <Text style={styles.summaryStatus}>Today</Text>
                  </View>
                  
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryIcon}>
                      <Flame size={20} color={Colors.warning} />
                    </View>
                    <Text style={styles.summaryValue}>{dailyStats.caloriesBurned}</Text>
                    <Text style={styles.summaryLabel}>Calories Burned</Text>
                    <Text style={styles.summaryStatus}>Active</Text>
                  </View>
                  
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryIcon}>
                      <Clock size={20} color={Colors.success} />
                    </View>
                    <Text style={styles.summaryValue}>{dailyStats.activeMinutes}</Text>
                    <Text style={styles.summaryLabel}>Active Minutes</Text>
                    <Text style={styles.summaryStatus}>Goal: 30</Text>
                  </View>
                </View>
              </View>

              {/* Recent Activity */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Activity</Text>
                  <TouchableOpacity>
                    <Text style={styles.viewAllText}>View All</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.activityList}>
                  {todayFoodScans.slice(0, 2).map((scan, index) => (
                    <View key={`food-${index}`} style={styles.activityItem}>
                      <View style={[styles.activityIcon, { backgroundColor: `${Colors.primary}15` }]}>
                        <Utensils size={20} color={Colors.primary} />
                      </View>
                      <View style={styles.activityContent}>
                        <Text style={styles.activityTitle}>{scan.food_name}</Text>
                        <Text style={styles.activitySubtitle}>
                          {scan.carbohydrates}g carbs • {scan.calories} calories
                        </Text>
                        <Text style={styles.activityTime}>
                          {new Date(scan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <ChevronRight size={16} color={Colors.textSecondary} />
                    </View>
                  ))}
                  
                  {todayActivities.slice(0, 2).map((activity, index) => (
                    <View key={`activity-${index}`} style={styles.activityItem}>
                      <View style={[styles.activityIcon, { backgroundColor: `${Colors.success}15` }]}>
                        <Activity size={20} color={Colors.success} />
                      </View>
                      <View style={styles.activityContent}>
                        <Text style={styles.activityTitle}>{activity.activity_type}</Text>
                        <Text style={styles.activitySubtitle}>
                          {activity.duration_minutes} min • {activity.calories_burned} calories
                        </Text>
                        <Text style={styles.activityTime}>
                          {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <ChevronRight size={16} color={Colors.textSecondary} />
                    </View>
                  ))}
                  
                  {todayFoodScans.length === 0 && todayActivities.length === 0 && (
                    <View style={styles.emptyState}>
                      <Plus size={32} color={Colors.textSecondary} />
                      <Text style={styles.emptyStateTitle}>No activity today</Text>
                      <Text style={styles.emptyStateSubtitle}>
                        Start by scanning food or logging an activity
                      </Text>
                      <TouchableOpacity 
                        style={styles.emptyStateButton}
                        onPress={() => {
                          toggleDashboard();
                          openCamera();
                        }}
                      >
                        <Text style={styles.emptyStateButtonText}>Get Started</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </Animated.View>

      {/* Settings Overlay */}
      <Animated.View 
        style={[
          styles.settingsOverlay,
          {
            transform: [{
              translateX: settingsAnimation
            }]
          }
        ]}
      >
        <View style={styles.settingsContainer}>
          <View style={styles.settingsHeader}>
            <TouchableOpacity onPress={toggleSettings}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.settingsTitle}>Settings</Text>
            <View style={{ width: 24 }} />
          </View>

          <TouchableOpacity 
            style={styles.settingsItem}
            onPress={() => {
              toggleSettings();
              router.push('/profile');
            }}
          >
            <User size={20} color={Colors.primary} />
            <Text style={styles.settingsItemText}>Profile</Text>
          </TouchableOpacity>

          <View style={styles.settingsDivider} />

          <TouchableOpacity style={styles.settingsItem}>
            <Bell size={20} color={Colors.textSecondary} />
            <Text style={styles.settingsItemText}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem}>
            <FileText size={20} color={Colors.textSecondary} />
            <Text style={styles.settingsItemText}>Terms of Use</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem}>
            <Shield size={20} color={Colors.textSecondary} />
            <Text style={styles.settingsItemText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Activity Modal */}
      <ActivityModal 
        visible={showActivityModal} 
        onClose={() => setShowActivityModal(false)}
      />

      {/* Photo Options Action Sheet */}
      {showPhotoOptions && (
        <View style={styles.actionSheetOverlay}>
          <TouchableOpacity 
            style={styles.actionSheetBackdrop} 
            onPress={() => setShowPhotoOptions(false)}
          />
          <View style={styles.actionSheetContainer}>
            <View style={styles.actionSheetHandle} />
            <TouchableOpacity 
              style={styles.actionSheetOption}
              onPress={selectFromGallery}
            >
              <FileText size={24} color={Colors.primary} />
              <Text style={styles.actionSheetOptionText}>Choose from Photo Library</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionSheetOption}
              onPress={takePhoto}
            >
              <Camera size={24} color={Colors.primary} />
              <Text style={styles.actionSheetOptionText}>Take a Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionSheetCancel}
              onPress={() => setShowPhotoOptions(false)}
            >
              <Text style={styles.actionSheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mainContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: Colors.text,
  },
  loadingSubtext: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: Colors.surface,

  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 16,
  },
  messageContainer: {
    maxWidth: '85%',
  },
  botMessageContainer: {
    alignSelf: 'flex-start',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  foodAnalysisCard: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  foodAnalysisTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    marginBottom: 8,
  },
  nutritionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  nutritionItem: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  insulinRecommendation: {
    alignItems: 'center',
    marginBottom: 8,
  },
  insulinUnits: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: 'white',
  },
  insulinLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  confidenceIndicator: {
    alignItems: 'center',
  },
  confidenceText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 4,
  },
  botMessageBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  userMessageBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 8,
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  botMessageText: {
    color: Colors.text,
  },
  userMessageText: {
    color: 'white',
  },
  messageTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  typingContainer: {
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  typingBubble: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 8,
  },
  typingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  suggestionsContainer: {
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  suggestionsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
    maxWidth: 200,
  },
  suggestionText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    flexShrink: 1,
  },
  inputContainer: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  plusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: Colors.text,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: Colors.primary,
  },
  sendButtonInactive: {
    backgroundColor: Colors.border,
  },
  
  // Dashboard Overlay Styles
  dashboardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: width,
    zIndex: 1000,
  },
  dashboardContainer: {
    flex: 1,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60, // Account for status bar
    paddingBottom: 20,
  },
  dashboardCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashboardHeaderTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
  dashboardScrollContent: {
    paddingBottom: 0,
  },
  
  // Main Circle Container
  mainCircleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  leftStat: {
    alignItems: 'center',
    flex: 1,
  },
  rightStat: {
    alignItems: 'center',
    flex: 1,
  },
  sideStatValue: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: 'white',
    marginBottom: 4,
  },
  sideStatLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
  },
  centralCircle: {
    alignItems: 'center',
    flex: 1.5,
  },
  glucoseCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glucoseValue: {
    fontSize: 42,
    fontFamily: 'Inter-Bold',
    color: 'white',
    marginBottom: 2,
  },
  glucoseUnit: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  glucoseLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 1,
  },
  
  // Macros Section
  macrosSection: {
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  macroLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 1,
    flex: 1,
    textAlign: 'center',
  },
  macroValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: 8,
  },
  macroProgress: {
    height: '100%',
    borderRadius: 2,
  },
  macroValue: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  
  // Curved Bottom
  curvedBottom: {
    alignItems: 'center',
    paddingBottom: 20,
  },

  // White Content Area
  whiteContentArea: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 20,
    minHeight: 600,
  },
  
  // Date Navigation
  dateNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.text,
  },
  
  // Sections
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: Colors.text,
  },
  sectionDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: Colors.textSecondary,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.primary,
  },
  
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 16,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
  },
  quickActionGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.text,
    textAlign: 'center',
  },
  
  // Summary Grid
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 16,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    width: (width - 80) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: Colors.text,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  summaryStatus: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: Colors.textSecondary,
  },
  
  // Weekly Goals
  weeklyGoalsCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  goalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: Colors.text,
  },
  goalProgress: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dayContainer: {
    alignItems: 'center',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayCompleted: {
    backgroundColor: Colors.success,
  },
  dayLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.textSecondary,
  },
  goalAchievement: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.success}15`,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  achievementText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.success,
  },
  
  // Activity List
  activityList: {
    paddingHorizontal: 24,
    gap: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.text,
    marginBottom: 4,
  },
  activitySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: Colors.textSecondary,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },

  // Settings Overlay Styles
  settingsOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 280,
    zIndex: 1000,
  },
  settingsContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  settingsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: Colors.text,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  settingsItemText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: Colors.text,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },

  // Camera styles
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  cameraHeaderTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: Colors.text,
  },
  cameraHeaderButton: {
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
  cameraContainer: {
    flex: 1,
    margin: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: Colors.primary,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  scanInstructions: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: 'white',
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  cameraControls: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  captureInstructions: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  analysisContainer: {
    flex: 1,
  },
  capturedImage: {
    width: '100%',
    height: 250,
    marginBottom: 20,
  },
  spinningLoader: {
    marginBottom: 16,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: Colors.error,
    textAlign: 'center',
    marginVertical: 16,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
  backButton: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.text,
  },
  imagePreviewContainer: {
    marginTop: 12,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.inputBackground,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionSheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionSheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  actionSheetContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
  },
  actionSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.textSecondary,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  actionSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    marginBottom: 8,
  },
  actionSheetOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.text,
    marginLeft: 12,
  },
  actionSheetCancel: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionSheetCancelText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.text,
  },
  recoveryOptionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  lightingButton: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  lightingButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.text,
  },
});