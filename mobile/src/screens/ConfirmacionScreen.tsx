import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiClient } from '../api/client';
import { getSession } from '../session';
import { fraseAlAzar } from '../lib/frases';
import { colors } from '../theme';
import type { RootStackParams } from '../navigation';

type Aviso = { id: number; titulo: string; mensaje: string };

export default function ConfirmacionScreen({ navigation, route }: NativeStackScreenProps<RootStackParams, 'Confirmacion'>) {
  const { tipo, enviada, nombre } = route.params;
  const [frase] = useState(() => fraseAlAzar(tipo));
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  useEffect(() => {
    if (tipo !== 'entrada') return;
    let vivo = true;
    (async () => {
      try {
        const token = (await getSession())?.token;
        const r = await apiClient.get<Aviso[]>('/api/movil/avisos', token);
        if (vivo && Array.isArray(r)) setAvisos(r);
      } catch {
        // sin avisos si falla
      }
    })();
    return () => {
      vivo = false;
    };
  }, [tipo]);

  const primerNombre = nombre.split(' ')[0];
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.cont}>
        <Text style={s.check}>✓</Text>
        <Text style={s.saludo}>{tipo === 'entrada' ? `¡Buenos días, ${primerNombre}!` : `¡Buen descanso, ${primerNombre}!`}</Text>
        <Text style={s.frase}>{frase}</Text>
        {!enviada ? (
          <Text style={s.offline}>Sin conexión: tu checada se enviará en cuanto haya señal.</Text>
        ) : null}
        {avisos.length > 0 ? (
          <View style={s.avisos}>
            <Text style={s.avisosTit}>Avisos de la gerencia</Text>
            {avisos.map((a) => (
              <View key={a.id} style={s.aviso}>
                <Text style={s.avisoTit}>{a.titulo}</Text>
                <Text style={s.avisoMsg}>{a.mensaje}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <Pressable style={s.boton} onPress={() => navigation.popToTop()} accessibilityRole="button">
        <Text style={s.botonTxt}>OK</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.fondo, padding: 24 },
  cont: { paddingTop: 24, paddingBottom: 16 },
  check: { fontSize: 72, color: colors.azul, textAlign: 'center', fontWeight: '800' },
  saludo: { fontSize: 32, fontWeight: '800', color: colors.texto, textAlign: 'center', marginTop: 8 },
  frase: { fontSize: 22, color: colors.gris, textAlign: 'center', marginTop: 16, lineHeight: 30 },
  offline: {
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.aviso,
    borderWidth: 2,
    borderColor: colors.avisoBorde,
    color: colors.texto,
    fontSize: 18,
    fontWeight: '600',
  },
  avisos: { marginTop: 28 },
  avisosTit: { fontSize: 20, fontWeight: '800', color: colors.azul, marginBottom: 8 },
  aviso: { borderWidth: 2, borderColor: colors.azul, borderRadius: 12, padding: 14, marginBottom: 10 },
  avisoTit: { fontSize: 18, fontWeight: '700', color: colors.texto },
  avisoMsg: { fontSize: 17, color: colors.texto, marginTop: 4 },
  boton: { backgroundColor: colors.azul, borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  botonTxt: { color: '#fff', fontSize: 24, fontWeight: '700' },
});
