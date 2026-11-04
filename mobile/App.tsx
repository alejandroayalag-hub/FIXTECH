import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getSession } from './src/session';
import LoginScreen from './src/screens/LoginScreen';
import InicioScreen from './src/screens/InicioScreen';
import ConfirmacionScreen from './src/screens/ConfirmacionScreen';
import type { RootStackParams } from './src/navigation';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParams>();

export default function App() {
  // undefined = still reading the stored session
  const [conSesion, setConSesion] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    getSession().then((s) => setConSesion(!!s), () => setConSesion(false));
  }, []);

  const alEntrar = useCallback(() => setConSesion(true), []);
  const alSalir = useCallback(() => setConSesion(false), []);

  if (conSesion === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.fondo }}>
        <ActivityIndicator size="large" color={colors.azul} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {conSesion ? (
            <>
              <Stack.Screen name="Inicio">{(p) => <InicioScreen {...p} onLogout={alSalir} />}</Stack.Screen>
              <Stack.Screen name="Confirmacion" component={ConfirmacionScreen} options={{ gestureEnabled: false }} />
            </>
          ) : (
            <Stack.Screen name="Login">{() => <LoginScreen onLogin={alEntrar} />}</Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
