const TIPOS_DOCUMENTO_SALIDA = ['finiquito', 'renuncia', 'aviso_rescisorio', 'entrega_materiales', 'baja_imss', 'encuesta_salida'];

// El documento de renuncia/rescisión depende del tipo de salida: despido genera
// aviso rescisorio, todo lo demás (renuncia, jubilación, otro) usa carta de renuncia.
function tipoRenunciaOAvisoRescisorio(tipoSalida) {
  return tipoSalida === 'despido' ? 'aviso_rescisorio' : 'renuncia';
}

function tiposDocumentoParaSalida(tipoSalida) {
  return ['finiquito', tipoRenunciaOAvisoRescisorio(tipoSalida), 'entrega_materiales', 'baja_imss', 'encuesta_salida'];
}

module.exports = { TIPOS_DOCUMENTO_SALIDA, tipoRenunciaOAvisoRescisorio, tiposDocumentoParaSalida };
