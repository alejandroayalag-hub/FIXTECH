import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Notifications from 'expo-notifications';
import { apiClient } from '../api/client';
import { clearSession, getSession } from '../session';
import { checar } from '../lib/checar';
import { checadasEnCola, flushQueue } from '../lib/offlineQueue';
import { syncReminders } from '../lib/reminders';
import { borrarYo, guardarYo, leerYo, siguienteTipo, type Yo } from '../lib/jornada';
import { colors } from '../theme';
import type { RootStackParams } from '../navigation';

type Props = NativeStackScreenProps<RootStackParams, 'Inicio'> & { onLogout: () => void };

// Module-level: a foreground event must not start a second flush while one runs.
let flushing = false;

const SIN_BLOQUEO =
  'Tu celular no tiene huella ni bloqueo de pantalla configurado. Configura un PIN, patrón o huella en los Ajustes del celular y vuelve a intentarlo.';
const CANCELADO = ['user_cancel', 'user_fallback', 'system_cancel', 'app_cancel'];

function hora(ts: string): string {
  return new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
}

export default function InicioScreen({ navigation, onLogout }: Props) {
  const [yo, setYo] = useState<Yo | null>(null);
  const [cola, setCola] = useState<Awaited<ReturnType<typeof checadasEnCola>>>([]);
  const [recien, setRecien] = useState<{ tipo: 'entrada' | 'salida'; timestamp_dispositivo: string } | null>(null);
  const [sinRed, setSinRed] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const refrescando = useRef(false);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const cerrarPorSesionExpirada = useCallback(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
    await clearSession();
    await borrarYo();
    onLogout();
  }, [onLogout]);

  const refrescar = useCallback(async () => {
    if (refrescando.current) return;
    refrescando.current = true;
    try {
      const token = (await getSession())?.token;
      const traerYo = async () => {
        const y = await apiClient.get<Yo>('/api/movil/yo', token);
        await guardarYo(y);
        return y;
      };
      let actual: Yo | null = null;
      let online = true;
      try {
        actual = await traerYo();
      } catch (err) {
        if ((err as { status?: number }).status === 401) {
          await cerrarPorSesionExpirada();
          return;
        }
        online = false;
        actual = await leerYo();
      }
      if (online && actual) await syncReminders(actual).catch(() => {}); // best effort, never marks offline
      if (!vivo.current) return;
      setYo(actual);
      setSinRed(!online);
      setCargando(false);

      if (!flushing) {
        flushing = true;
        try {
          const r = await flushQueue();
          if (r.sentAny && online) {
            actual = await traerYo().catch(() => actual);
            if (vivo.current) setYo(actual);
          }
        } catch (err) {
          console.warn('ATA Checador: no se pudo reenviar la cola', err);
        } finally {
          flushing = false;
        }
      }
      const pendientes = await checadasEnCola();
      if (vivo.current) {
        setCola(pendientes);
        setRecien(null); // server/queue now reflect it
      }
    } finally {
      refrescando.current = false;
      if (vivo.current) setCargando(false);
    }
  }, [cerrarPorSesionExpirada]);

  // Runs on mount and every time this screen regains focus (e.g. back from Confirmación).
  useFocusEffect(
    useCallback(() => {
      refrescar();
    }, [refrescar]),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') refrescar();
    });
    return () => sub.remove();
  }, [refrescar]);

  const { tipo, ultima } = siguienteTipo(yo?.ultima_hoy ?? null, recien ? [...cola, recien] : cola);

  async function pulsar() {
    if (ocupado) return;
    setOcupado(true);
    setError('');
    try {
      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirma con tu huella',
        cancelLabel: 'Cancelar',
      });
      if (!auth.success) {
        const e = (auth as { error?: string }).error ?? '';
        if (e === 'not_enrolled' || e === 'passcode_not_set' || e === 'not_available') setError(SIN_BLOQUEO);
        else if (e === 'lockout') setError('Demasiados intentos fallidos. Espera un momento e inténtalo de nuevo.');
        else if (!CANCELADO.includes(e)) setError('No se pudo verificar tu huella. Inténtalo de nuevo.');
        return;
      }
      const { enviada } = await checar(tipo);
      // Until the refresh completes, the button must already show the next type.
      setRecien({ tipo, timestamp_dispositivo: new Date().toISOString() });
      navigation.navigate('Confirmacion', { tipo, enviada, nombre: yo?.nombre ?? '' });
    } catch (err) {
      setError((err as Error).message || 'No se pudo registrar la checada.');
    } finally {
      if (vivo.current) setOcupado(false);
    }
  }

  async function cerrarSesion() {
    const pendientes = (await checadasEnCola()).length;
    const aviso =
      pendientes > 0
        ? `Tienes checadas sin enviar (${pendientes}). Se conservarán en este celular y se enviarán cuando vuelvas a iniciar sesión con señal. ¿Cerrar sesión?`
        : '¿Seguro que quieres cerrar sesión?';
    Alert.alert('Cerrar sesión', aviso, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
          await clearSession();
          await borrarYo();
          onLogout();
        },
      },
    ]);
  }

  const esEntrada = tipo === 'entrada';
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.titulo}>ATA Checador</Text>
        <Pressable onPress={cerrarSesion} hitSlop={12} accessibilityRole="button">
          <Text style={s.salir}>Cerrar sesión</Text>
        </Pressable>
      </View>

      {cargando && !yo ? (
        <View style={s.centro}>
          <ActivityIndicator size="large" color={colors.azul} />
        </View>
      ) : !yo ? (
        <View style={s.centro}>
          <Text style={s.estado}>No se pudo cargar tu información. Conéctate a internet una vez para continuar.</Text>
          <Pressable style={s.reintentar} onPress={refrescar} accessibilityRole="button">
            <Text style={s.reintentarTxt}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <View style={s.centro}>
          <Text style={s.nombre}>{yo.nombre}</Text>
          <Text style={s.estado}>
            {ultima
              ? ultima.tipo === 'entrada'
                ? `Entrada registrada a las ${hora(ultima.timestamp)}`
                : `Salida registrada a las ${hora(ultima.timestamp)}`
              : 'Hoy aún no has iniciado tu jornada'}
          </Text>
          {sinRed ? <Text style={s.nota}>Sin conexión: usando tu última información guardada.</Text> : null}
          {cola.length > 0 ? (
            <Text style={s.nota}>Tienes {cola.length} checada(s) pendiente(s) de enviar.</Text>
          ) : null}
          <Pressable
            style={[s.boton, !esEntrada && s.botonSalida, ocupado && s.botonOff]}
            onPress={pulsar}
            disabled={ocupado}
            accessibilityRole="button"
          >
            {ocupado ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <Text style={s.botonTxt}>{esEntrada ? 'Iniciar jornada' : 'Terminar jornada'}</Text>
            )}
          </Pressable>
          {error ? <Text style={s.error}>{error}</Text> : null}
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.fondo },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  titulo: { fontSize: 20, fontWeight: '800', color: colors.azul },
  salir: { fontSize: 17, fontWeight: '600', color: colors.azul, textDecorationLine: 'underline' },
  centro: { flex: 1, padding: 24, justifyContent: 'center' },
  nombre: { fontSize: 30, fontWeight: '800', color: colors.texto, textAlign: 'center' },
  estado: { fontSize: 20, color: colors.gris, textAlign: 'center', marginTop: 10, marginBottom: 16 },
  nota: { fontSize: 17, fontWeight: '600', color: colors.texto, textAlign: 'center', marginBottom: 12 },
  boton: { backgroundColor: colors.azul, borderRadius: 20, paddingVertical: 36, alignItems: 'center', marginTop: 16, minHeight: 110, justifyContent: 'center' },
  botonSalida: { backgroundColor: colors.azulOscuro },
  botonOff: { opacity: 0.6 },
  botonTxt: { color: '#fff', fontSize: 32, fontWeight: '800' },
  error: { color: colors.error, fontSize: 18, fontWeight: '600', textAlign: 'center', marginTop: 16 },
  reintentar: { backgroundColor: colors.azul, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  reintentarTxt: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
