import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useWalletStore } from '../hooks/useWalletStore';
import { CHAINS_BY_ID } from '@trinity/core';

export function SettingsScreen() {
  const { currentChainId, switchChain, lock } = useWalletStore();
  const [biometrics, setBiometrics] = useState(true);
  const [autoLock, setAutoLock] = useState(true);
  const [hideBalance, setHideBalance] = useState(false);

  const chains = Object.values(CHAINS_BY_ID);

  const handleNetworkChange = (chainId: number) => {
    switchChain(chainId);
    Alert.alert('Network Changed', `Switched to ${CHAINS_BY_ID[chainId]?.name}`);
  };

  const handleExportSeed = () => {
    Alert.alert(
      'Export Recovery Phrase',
      'Are you sure you want to view your recovery phrase? Never share this with anyone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Phrase', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Settings</Text>

        {/* Network Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Network</Text>
          <View style={styles.networkGrid}>
            {chains.slice(0, 6).map(chain => (
              <TouchableOpacity
                key={chain.id}
                style={[
                  styles.networkButton,
                  currentChainId === chain.id && styles.networkButtonActive,
                ]}
                onPress={() => handleNetworkChange(chain.id)}
              >
                <Text style={styles.networkName}>{chain.shortName}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Biometric Unlock</Text>
              <Text style={styles.settingDescription}>Use Face ID or fingerprint</Text>
            </View>
            <Switch
              value={biometrics}
              onValueChange={setBiometrics}
              trackColor={{ false: '#374151', true: '#0ea5e9' }}
            />
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-Lock</Text>
              <Text style={styles.settingDescription}>Lock after 5 minutes</Text>
            </View>
            <Switch
              value={autoLock}
              onValueChange={setAutoLock}
              trackColor={{ false: '#374151', true: '#0ea5e9' }}
            />
          </View>
          <TouchableOpacity style={styles.settingRow} onPress={handleExportSeed}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Export Recovery Phrase</Text>
              <Text style={styles.settingDescription}>View your 12-word phrase</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Hide Balances</Text>
              <Text style={styles.settingDescription}>Show *** instead of amounts</Text>
            </View>
            <Switch
              value={hideBalance}
              onValueChange={setHideBalance}
              trackColor={{ false: '#374151', true: '#0ea5e9' }}
            />
          </View>
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Social Recovery</Text>
              <Text style={styles.settingDescription}>Set up guardian recovery</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>0.1.0</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>License</Text>
            <Text style={styles.aboutValue}>MIT</Text>
          </View>
        </View>

        {/* Lock Button */}
        <TouchableOpacity style={styles.lockButton} onPress={lock}>
          <Text style={styles.lockButtonText}>🔒 Lock Wallet</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  scrollContent: { padding: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 24 },
  section: { marginBottom: 32 },
  sectionTitle: { color: '#9ca3af', fontSize: 14, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase' },
  networkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  networkButton: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  networkButtonActive: { borderColor: '#0ea5e9' },
  networkName: { color: '#ffffff', fontSize: 14, fontWeight: '500' },
  settingRow: {
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  settingInfo: { flex: 1 },
  settingLabel: { color: '#ffffff', fontSize: 16, marginBottom: 2 },
  settingDescription: { color: '#9ca3af', fontSize: 12 },
  arrow: { color: '#6b7280', fontSize: 18 },
  aboutRow: {
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  aboutLabel: { color: '#9ca3af', fontSize: 16 },
  aboutValue: { color: '#ffffff', fontSize: 16 },
  lockButton: {
    backgroundColor: '#dc2626',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  lockButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
