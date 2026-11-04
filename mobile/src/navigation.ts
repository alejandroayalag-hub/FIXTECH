export type RootStackParams = {
  Login: undefined;
  Inicio: undefined;
  Confirmacion: { tipo: 'entrada' | 'salida'; enviada: boolean; nombre: string };
};
