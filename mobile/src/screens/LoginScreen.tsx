import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiClient } from '../api/client';
import { empleadoIdDeToken, saveSession } from '../session';
import { colors } from '../theme';

type Props = { onLogin: () => void };

export default function LoginScreen({ onLogin }: Props) {
  const [empleado, setEmpleado] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function entrar() {
    if (cargando) return;
    if (!empleado.trim() || !pin) {
      setError('Escribe tu número de empleado y tu PIN.');
      return;
    }
    setCargando(true);
    setError('');
    try {
      const r = await apiClient.post<{ token: string; nombre: string }>('/api/movil/login', {
        empleado: empleado.trim(),
        pin,
      });
      await saveSession({ token: r.token, nombre: r.nombre, empleadoId: empleadoIdDeToken(r.token) });
      onLogin();
    } catch (err) {
      const status = (err as { status?: number }).status;
      setError(
        typeof status === 'number' && status < 500
          ? (err as Error).message
          : 'No se pudo conectar. Revisa tu señal e inténtalo de nuevo.',
      );
      setCargando(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.cont} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Image source={require('../../assets/splash-icon.png')} style={s.logo} resizeMode="contain" />
        <Text style={s.titulo}>ATA Checador</Text>
        <Text style={s.label}>Número de empleado</Text>
        <TextInput
          style={s.input}
          value={empleado}
          onChangeText={setEmpleado}
          keyboardType="number-pad"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Número de empleado"
        />
        <Text style={s.label}>PIN</Text>
        <TextInput
          style={s.input}
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="PIN"
          onSubmitEditing={entrar}
        />
        {error ? <Text style={s.error}>{error}</Text> : null}
        <Pressable style={[s.boton, cargando && s.botonOff]} onPress={entrar} disabled={cargando} accessibilityRole="button">
          {cargando ? <ActivityIndicator color="#fff" /> : <Text style={s.botonTxt}>Entrar</Text>}
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.fondo },
  cont: { flex: 1, padding: 24, justifyContent: 'center' },
  logo: { width: 120, height: 120, alignSelf: 'center' },
  titulo: { fontSize: 28, fontWeight: '800', color: colors.azul, textAlign: 'center', marginBottom: 24 },
  label: { fontSize: 18, fontWeight: '600', color: colors.texto, marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 2,
    borderColor: colors.borde,
    borderRadius: 12,
    padding: 14,
    fontSize: 22,
    color: colors.texto,
    backgroundColor: '#fff',
  },
  error: { color: colors.error, fontSize: 17, fontWeight: '600', marginTop: 14 },
  boton: { backgroundColor: colors.azul, borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 24 },
  botonOff: { opacity: 0.6 },
  botonTxt: { color: '#fff', fontSize: 22, fontWeight: '700' },
});
