const express = require('express')
const db = require('../db')
const autenticar = require('../middleware/autenticar')
const router = express.Router()

router.use(autenticar)

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM categorias WHERE utilizador_id = $1 ORDER BY tipo, nome',
      [req.utilizador.id]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar categorias.' })
  }
})

module.exports = router