import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useWalletStore } from './src/hooks/useWalletStore';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

const customTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#0ea5e9',
    background: '#111827',
    card: '#1f2937',
    text: '#ffffff',
    border: '#374151',
    notification: '#0ea5e9',
  },
};

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const initialize = useWalletStore(state => state.initialize);

  useEffect(() => {
    const init = async () => {
      try {
        await initialize();
      } catch (error) {
        console.error('Failed to initialize wallet:', error);
      } finally {
        setIsReady(true);
      }
    };

    init();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.logo}>🔺</Text>
        <Text style={styles.title}>Trinity Wallet</Text>
        <ActivityIndicator size="large" color="#0ea5e9" style={styles.loader} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer theme={customTheme}>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 32,
  },
  loader: {
    marginTop: 16,
  },
});
