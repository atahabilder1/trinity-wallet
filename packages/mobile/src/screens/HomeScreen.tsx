import { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useWalletStore } from '../hooks/useWalletStore';
import { CHAINS_BY_ID } from '@trinity/core';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { currentAccount, currentChainId, balance, loadBalance, lock } = useWalletStore();

  const chain = CHAINS_BY_ID[currentChainId];

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyAddress = async () => {
    if (currentAccount?.address) {
      await Clipboard.setStringAsync(currentAccount.address);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const onRefresh = useCallback(async () => {
    await loadBalance();
  }, [loadBalance]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="#0ea5e9" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.logo}>🔺</Text>
            <Text style={styles.appName}>Trinity</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.chainBadge}>
              <Text style={styles.chainText}>{chain?.shortName || 'ETH'}</Text>
            </View>
            <TouchableOpacity onPress={lock}>
              <Text style={styles.lockIcon}>🔒</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Card */}
        <View style={styles.accountCard}>
          <Text style={styles.accountName}>{currentAccount?.name || 'Account 1'}</Text>
          <TouchableOpacity onPress={copyAddress}>
            <Text style={styles.address}>
              {currentAccount ? formatAddress(currentAccount.address) : ''}
              <Text style={styles.copyIcon}> 📋</Text>
            </Text>
          </TouchableOpacity>

          <Text style={styles.balance}>
            {parseFloat(balance).toFixed(4)} {chain?.nativeCurrency.symbol || 'ETH'}
          </Text>
          <Text style={styles.chainName}>on {chain?.name || 'Ethereum'}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Send')}
          >
            <Text style={styles.actionIcon}>↗️</Text>
            <Text style={styles.actionText}>Send</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Receive')}
          >
            <Text style={styles.actionIcon}>↙️</Text>
            <Text style={styles.actionText}>Receive</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>🔄</Text>
            <Text style={styles.actionText}>Swap</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>🛡️</Text>
            <Text style={styles.actionText}>Shield</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Features</Text>
          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>🔒</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Stealth Addresses</Text>
              <Text style={styles.featureDescription}>Generate one-time addresses for receiving</Text>
            </View>
            <Text style={styles.featureArrow}>→</Text>
          </View>
          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>🛡️</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>ZK Transactions</Text>
              <Text style={styles.featureDescription}>Private transfers via Railgun</Text>
            </View>
            <Text style={styles.featureArrow}>→</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  scrollContent: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logo: { fontSize: 28, marginRight: 8 },
  appName: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chainBadge: { backgroundColor: '#374151', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  chainText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  lockIcon: { fontSize: 20 },
  accountCard: { backgroundColor: '#1f2937', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24 },
  accountName: { color: '#9ca3af', fontSize: 14, marginBottom: 4 },
  address: { color: '#ffffff', fontSize: 16, marginBottom: 16 },
  copyIcon: { fontSize: 14 },
  balance: { color: '#ffffff', fontSize: 36, fontWeight: 'bold', marginBottom: 4 },
  chainName: { color: '#9ca3af', fontSize: 14 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 32 },
  actionButton: { alignItems: 'center', backgroundColor: '#1f2937', padding: 16, borderRadius: 16, width: 80 },
  actionIcon: { fontSize: 24, marginBottom: 8 },
  actionText: { color: '#ffffff', fontSize: 12 },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#9ca3af', fontSize: 14, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase' },
  featureCard: { backgroundColor: '#1f2937', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  featureIcon: { fontSize: 24, marginRight: 12 },
  featureContent: { flex: 1 },
  featureTitle: { color: '#ffffff', fontSize: 16, fontWeight: '500', marginBottom: 2 },
  featureDescription: { color: '#9ca3af', fontSize: 12 },
  featureArrow: { color: '#6b7280', fontSize: 18 },
});
