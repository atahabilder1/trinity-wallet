import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useWalletStore } from '../hooks/useWalletStore';
import { CHAINS_BY_ID } from '@trinity/core';

export function SendScreen() {
  const navigation = useNavigation();
  const { currentChainId } = useWalletStore();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const chain = CHAINS_BY_ID[currentChainId];

  const handleSend = async () => {
    if (!recipient || !amount) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // Transaction would be built and signed here
      Alert.alert('Success', 'Transaction sent!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to send transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Send</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Recipient Address</Text>
          <TextInput
            style={styles.input}
            placeholder="0x..."
            placeholderTextColor="#6b7280"
            value={recipient}
            onChangeText={setRecipient}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount ({chain?.nativeCurrency.symbol})</Text>
          <TextInput
            style={styles.input}
            placeholder="0.0"
            placeholderTextColor="#6b7280"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.privacyOptions}>
          <Text style={styles.sectionTitle}>Privacy Options</Text>
          <TouchableOpacity style={styles.optionButton}>
            <Text style={styles.optionIcon}>🔒</Text>
            <Text style={styles.optionText}>Use Stealth Address</Text>
            <Text style={styles.optionToggle}>Off</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionButton}>
            <Text style={styles.optionIcon}>🛡️</Text>
            <Text style={styles.optionText}>Flashbots Protect</Text>
            <Text style={styles.optionToggle}>On</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.sendButton, loading && styles.buttonDisabled]}
          onPress={handleSend}
          disabled={loading}
        >
          <Text style={styles.sendButtonText}>
            {loading ? 'Sending...' : 'Send Transaction'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  closeButton: { color: '#9ca3af', fontSize: 20, padding: 8 },
  title: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  inputGroup: { marginBottom: 24 },
  label: { color: '#9ca3af', fontSize: 14, marginBottom: 8 },
  input: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
  },
  privacyOptions: { marginBottom: 32 },
  sectionTitle: { color: '#9ca3af', fontSize: 14, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase' },
  optionButton: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionIcon: { fontSize: 20, marginRight: 12 },
  optionText: { flex: 1, color: '#ffffff', fontSize: 16 },
  optionToggle: { color: '#0ea5e9', fontSize: 14 },
  sendButton: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  sendButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
});
