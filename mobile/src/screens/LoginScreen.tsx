import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';

const DEMO_ACCOUNTS = [
  { role: 'Inspector', email: 'inspector@seedsphere.com', password: 'Inspector123!' },
  { role: 'Admin', email: 'admin@seedsphere.com', password: 'Admin123!' },
];

export default function LoginScreen() {
  const { signIn, error } = useAuth();
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState(DEMO_ACCOUNTS[0].password);
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async () => {
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch {
      // error is surfaced via context state
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>SeedSphere Field Ops</Text>
      <Text style={styles.subtitle}>Sign in to capture field inspections</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <Text style={styles.label}>Password</Text>
      <TextInput style={styles.input} secureTextEntry value={password} onChangeText={setPassword} />

      <Pressable style={styles.button} onPress={handleSignIn} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
      </Pressable>

      <Text style={styles.demoLabel}>Quick demo accounts</Text>
      {DEMO_ACCOUNTS.map((account) => (
        <Pressable
          key={account.email}
          style={styles.demoRow}
          onPress={() => {
            setEmail(account.email);
            setPassword(account.password);
          }}
        >
          <Text style={styles.demoText}>{account.role} — {account.email}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, padding: spacing.xl, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.primary, marginBottom: spacing.xs },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xl },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.card,
    fontSize: 15,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  error: { color: colors.danger, marginBottom: spacing.md },
  demoLabel: { marginTop: spacing.xl, fontSize: 12, color: colors.textMuted, textTransform: 'uppercase' },
  demoRow: { paddingVertical: spacing.sm },
  demoText: { color: colors.info, fontSize: 13 },
});
