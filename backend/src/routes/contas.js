const express = require('express')
const db = require('../db')
const autenticar = require('../middleware/autenticar')
const router = express.Router()

router.use(autenticar)

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM contas WHERE utilizador_id = $1 AND ativo = true ORDER BY nome',
      [req.utilizador.id]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar contas.' })
  }
})

module.exports = router