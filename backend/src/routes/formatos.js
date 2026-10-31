const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../db/pool');

const DIR_FORMATOS = path.join(__dirname, '..', '..', 'uploads', 'formatos');
if (!fs.existsSync(DIR_FORMATOS)) fs.mkdirSync(DIR_FORMATOS, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, DIR_FORMATOS),
  filename: (req, file, cb) => {
    // nombre fijo basado en el tipo: formato_<tipoId>.pdf — sobreescribe si ya existe
    cb(null, `formato_${req.params.tipoId}.pdf`);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.pdf') cb(null, true);
    else cb(new Error('Solo se permiten archivos PDF'));
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

// GET /api/formatos — lista tipos con indicador de formato disponible
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nombre, requerido, formato_ruta FROM tipos_documento ORDER BY nombre'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/formatos/:tipoId — sube el PDF de formato para ese tipo
router.post('/:tipoId', upload.single('archivo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
    const ruta = req.file.path;
    const { rows } = await pool.query(
      'UPDATE tipos_documento SET formato_ruta=$1 WHERE id=$2 RETURNING id, nombre, formato_ruta',
      [ruta, req.params.tipoId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Tipo no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/formatos/:tipoId/descargar — descarga el PDF de formato
router.get('/:tipoId/descargar', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT nombre, formato_ruta FROM tipos_documento WHERE id=$1',
      [req.params.tipoId]
    );
    if (!rows.length || !rows[0].formato_ruta)
      return res.status(404).json({ error: 'Sin formato disponible' });
    const ruta = path.resolve(rows[0].formato_ruta);
    if (!fs.existsSync(ruta))
      return res.status(404).json({ error: 'Archivo no encontrado en el servidor' });
    res.download(ruta, `${rows[0].nombre}.pdf`);
  } catch (err) { next(err); }
});

// DELETE /api/formatos/:tipoId — elimina el formato
router.delete('/:tipoId', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'UPDATE tipos_documento SET formato_ruta=NULL WHERE id=$1 RETURNING formato_ruta',
      [req.params.tipoId]
    );
    if (rows[0]?.formato_ruta && fs.existsSync(rows[0].formato_ruta))
      fs.unlinkSync(rows[0].formato_ruta);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
