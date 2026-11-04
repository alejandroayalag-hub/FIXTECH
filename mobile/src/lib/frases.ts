export const FRASES_ENTRADA: string[] = [
  "¡Buenos días! Que tengas una excelente jornada.",
  "Bienvenido, que sea una excelente jornada.",
  "¡Qué gusto verte! Te deseamos una excelente jornada.",
  "Hoy es un gran día para lograr cosas buenas. ¡Excelente jornada!",
  "Empieza con energía, ¡excelente jornada!",
  "Tu trabajo hace la diferencia. ¡Excelente jornada!",
  "Que todo salga muy bien hoy. ¡Excelente jornada!",
  "Gracias por estar aquí. ¡Que tengas una excelente jornada!",
  "¡Adelante! Te deseamos una excelente jornada.",
  "Con buena actitud todo se puede. ¡Excelente jornada!",
  "Que hoy sea un día lleno de buenos resultados. ¡Excelente jornada!",
  "Un día más para brillar. ¡Excelente jornada!",
  "Contamos contigo, ¡que tengas una excelente jornada!",
  "¡Hola! Que el día te trate muy bien y tengas una excelente jornada.",
  "Respira hondo y a disfrutar el día. ¡Excelente jornada!",
  "Tu esfuerzo siempre se nota. ¡Excelente jornada!",
];

export const FRASES_SALIDA: string[] = [
  "Gracias por tu trabajo de hoy. ¡Buen descanso!",
  "¡Misión cumplida! Que tengas un buen descanso.",
  "Te lo ganaste: ¡buen descanso!",
  "Gracias por tu esfuerzo. ¡Que descanses muy bien!",
  "Hasta mañana, ¡buen descanso!",
  "Disfruta tu tarde y ten un buen descanso.",
  "Hiciste un gran trabajo hoy. ¡Buen descanso!",
  "Ve con bien a casa. ¡Buen descanso!",
  "Descansa, recarga energías y nos vemos pronto. ¡Buen descanso!",
  "Un día más bien logrado. ¡Buen descanso!",
  "Gracias por dar lo mejor de ti. ¡Buen descanso!",
  "Que disfrutes a tu familia y tengas un buen descanso.",
  "Tu dedicación vale mucho. ¡Buen descanso!",
  "Cierra el día con tranquilidad. ¡Buen descanso!",
  "¡Gracias por tu compromiso! Que tengas un buen descanso.",
  "Nos vemos en la próxima jornada. ¡Buen descanso!",
];

export function fraseAlAzar(tipo: 'entrada' | 'salida', rnd: () => number = Math.random): string {
  const lista = tipo === 'entrada' ? FRASES_ENTRADA : FRASES_SALIDA;
  return lista[Math.floor(rnd() * lista.length)];
}
