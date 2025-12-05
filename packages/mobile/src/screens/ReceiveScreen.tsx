import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useWalletStore } from '../hooks/useWalletStore';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

export function ReceiveScreen() {
  const navigation = useNavigation();
  const { currentAccount } = useWalletStore();

  const copyAddress = async () => {
    if (currentAccount?.address) {
      await Clipboard.setStringAsync(currentAccount.address);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const shareAddress = async () => {
    if (currentAccount?.address) {
      await Share.share({
        message: currentAccount.address,
        title: 'My Trinity Wallet Address',
      });
    }
  };

  const generateStealthAddress = () => {
    // Would generate a new stealth address
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Receive</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* QR Code Placeholder */}
        <View style={styles.qrContainer}>
          <View style={styles.qrPlaceholder}>
            <Text style={styles.qrIcon}>📱</Text>
            <Text style={styles.qrText}>QR Code</Text>
          </View>
        </View>

        {/* Address */}
        <View style={styles.addressContainer}>
          <Text style={styles.addressLabel}>Your Address</Text>
          <Text style={styles.address}>{currentAccount?.address}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={copyAddress}>
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionText}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={shareAddress}>
            <Text style={styles.actionIcon}>↗️</Text>
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Option */}
        <View style={styles.privacySection}>
          <Text style={styles.sectionTitle}>Privacy Mode</Text>
          <TouchableOpacity style={styles.stealthButton} onPress={generateStealthAddress}>
            <View style={styles.stealthContent}>
              <Text style={styles.stealthIcon}>🔒</Text>
              <View>
                <Text style={styles.stealthTitle}>Generate Stealth Address</Text>
                <Text style={styles.stealthDescription}>
                  One-time address that can't be linked to your wallet
                </Text>
              </View>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  closeButton: { color: '#9ca3af', fontSize: 20, padding: 8 },
  title: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  content: { flex: 1, padding: 16, alignItems: 'center' },
  qrContainer: { marginVertical: 32 },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrIcon: { fontSize: 48, marginBottom: 8 },
  qrText: { color: '#374151', fontSize: 14 },
  addressContainer: { alignItems: 'center', marginBottom: 32 },
  addressLabel: { color: '#9ca3af', fontSize: 14, marginBottom: 8 },
  address: { color: '#ffffff', fontSize: 12, fontFamily: 'monospace', textAlign: 'center', paddingHorizontal: 16 },
  actions: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  actionButton: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionIcon: { fontSize: 18 },
  actionText: { color: '#ffffff', fontSize: 16, fontWeight: '500' },
  privacySection: { width: '100%' },
  sectionTitle: { color: '#9ca3af', fontSize: 14, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase' },
  stealthButton: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stealthContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stealthIcon: { fontSize: 24, marginRight: 12 },
  stealthTitle: { color: '#ffffff', fontSize: 16, fontWeight: '500', marginBottom: 2 },
  stealthDescription: { color: '#9ca3af', fontSize: 12 },
  arrowIcon: { color: '#6b7280', fontSize: 18 },
});
