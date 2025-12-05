import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWalletStore } from '../hooks/useWalletStore';
import * as LocalAuthentication from 'expo-local-authentication';

export function UnlockScreen() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const unlock = useWalletStore(state => state.unlock);

  const handleUnlock = async () => {
    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const success = await unlock(password);
      if (!success) {
        Alert.alert('Error', 'Invalid password');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to unlock wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      Alert.alert('Biometric not available', 'Please use your password');
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Trinity Wallet',
      cancelLabel: 'Use Password',
    });

    if (result.success) {
      // In production, retrieve stored password and unlock
      Alert.alert('Success', 'Biometric authentication successful');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>🔒</Text>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Enter your password to unlock</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#6b7280"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleUnlock}
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleUnlock}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Unlocking...' : 'Unlock'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.biometricButton} onPress={handleBiometric}>
          <Text style={styles.biometricIcon}>👆</Text>
          <Text style={styles.biometricText}>Use Biometrics</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 64, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#9ca3af', marginBottom: 32 },
  form: { width: '100%', marginBottom: 24 },
  input: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    padding: 12,
  },
  biometricIcon: { fontSize: 24, marginRight: 8 },
  biometricText: { color: '#0ea5e9', fontSize: 16 },
});
