require('dotenv').config()
const PORT = process.env.PORT || 3001
const URL = process.env.MONGODB_URI

const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const mongoose = require('mongoose')

const Person = require('./models/person')

const app = express()

// Conexión a MongoDB
mongoose.set('strictQuery', false)

mongoose.connect(URL)
  .then(() => {
    console.log('✅ Conectado a MongoDB')
    console.log(`📡 Servidor corriendo en el puerto ${PORT}`)
  })
  .catch(err => {
    console.error('❌ Error de conexión a MongoDB:', err.message)
    process.exit(1)
  })

// Middlewares
app.use(cors())
app.use(express.json())
app.use(express.static('dist'))

// Morgan con logging de body
morgan.token('body', (req) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    return JSON.stringify(req.body)
  }
  return ''
})
app.use(morgan(':method :url :status :res[content-length] - :response-time ms :body'))

// ================= RUTAS =================

// OBTENER TODOS
app.get('/api/persons', async (req, res, next) => {
  try {
    const persons = await Person.find({}).sort({ name: 1 })
    res.json(persons)
  } catch (error) {
    next(error)
  }
})

// OBTENER POR ID
app.get('/api/persons/:id', async (req, res, next) => {
  try {
    const person = await Person.findById(req.params.id)
    if (person) {
      res.json(person)
    } else {
      res.status(404).json({ error: 'Persona no encontrada' })
    }
  } catch (error) {
    next(error)
  }
})

// CREAR NUEVA PERSONA
app.post('/api/persons', async (req, res, next) => {
  try {
    let { name, number, countryCode } = req.body

    if (!name || !number) {
      return res.status(400).json({ 
        error: 'El nombre y el número de teléfono son obligatorios' 
      })
    }

    // Verificar formato del número
    const phonePattern = /^\+\d{2}\s\d{3}\s\d{3}\s\d{3}$/
    if (!phonePattern.test(number)) {
      return res.status(400).json({ 
        error: 'Formato de teléfono inválido',
        message: 'Usa el formato: +34 654 827 120'
      })
    }

    // Verificar si ya existe una persona con el mismo nombre
    const existingPerson = await Person.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    })
    
    if (existingPerson) {
      return res.status(400).json({ 
        error: `Ya existe una persona con el nombre "${name}" en la agenda`
      })
    }

    const person = new Person({ 
      name: name.trim(), 
      number,
      countryCode: countryCode || number.substring(0, 3)
    })
    
    const savedPerson = await person.save()
    res.status(201).json(savedPerson)
    
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Error de validación',
        details: error.message
      })
    }
    next(error)
  }
})

// ACTUALIZAR PERSONA COMPLETA
app.put('/api/persons/:id', async (req, res, next) => {
  try {
    let { name, number, countryCode } = req.body

    if (!name || !number) {
      return res.status(400).json({ 
        error: 'El nombre y el número de teléfono son obligatorios' 
      })
    }

    // Verificar formato del número
    const phonePattern = /^\+\d{2}\s\d{3}\s\d{3}\s\d{3}$/
    if (!phonePattern.test(number)) {
      return res.status(400).json({ 
        error: 'Formato de teléfono inválido',
        message: 'Usa el formato: +34 654 827 120'
      })
    }

    // Verificar si el nuevo nombre ya existe en otra persona
    const existingPerson = await Person.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: req.params.id }
    })
    
    if (existingPerson) {
      return res.status(400).json({ 
        error: `Ya existe una persona con el nombre "${name}" en la agenda`
      })
    }

    const updatedPerson = await Person.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), number, countryCode: countryCode || number.substring(0, 3) },
      { 
        new: true,
        runValidators: true,
        context: 'query'
      }
    )

    if (updatedPerson) {
      res.json(updatedPerson)
    } else {
      res.status(404).json({ error: 'Persona no encontrada' })
    }
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message })
    }
    next(error)
  }
})

// ACTUALIZAR PARCIALMENTE (SOLO EL NÚMERO)
app.patch('/api/persons/:id', async (req, res, next) => {
  try {
    let { number, countryCode } = req.body

    if (!number) {
      return res.status(400).json({ 
        error: 'El número de teléfono es obligatorio para la actualización parcial' 
      })
    }

    // Verificar formato del número
    const phonePattern = /^\+\d{2}\s\d{3}\s\d{3}\s\d{3}$/
    if (!phonePattern.test(number)) {
      return res.status(400).json({ 
        error: 'Formato de teléfono inválido',
        message: 'Usa el formato: +34 654 827 120'
      })
    }

    const updatedPerson = await Person.findByIdAndUpdate(
      req.params.id,
      { number, ...(countryCode && { countryCode }) },
      { 
        new: true,
        runValidators: true,
        context: 'query'
      }
    )

    if (updatedPerson) {
      res.json(updatedPerson)
    } else {
      res.status(404).json({ error: 'Persona no encontrada' })
    }
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message })
    }
    next(error)
  }
})

// ELIMINAR PERSONA
app.delete('/api/persons/:id', async (req, res, next) => {
  try {
    const deletedPerson = await Person.findByIdAndDelete(req.params.id)
    
    if (deletedPerson) {
      res.status(204).end()
    } else {
      res.status(404).json({ error: 'Persona no encontrada' })
    }
  } catch (error) {
    next(error)
  }
})

// INFORMACIÓN DE LA AGENDA
app.get('/info', async (req, res, next) => {
  try {
    const count = await Person.countDocuments({})
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Agenda Telefónica - API</title>
          <style>
            body {
              font-family: system-ui, sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .card {
              background: white;
              border-radius: 20px;
              padding: 30px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            h1 { color: #667eea; margin-top: 0; }
            .info { background: #f0f0f0; padding: 15px; border-radius: 10px; margin: 20px 0; }
            .badge { display: inline-block; padding: 5px 10px; border-radius: 20px; background: #10b981; color: white; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>📞 Agenda Telefónica</h1>
            <div class="info">
              <p>📊 Total de contactos: <strong>${count}</strong></p>
              <p>🟢 Estado: <span class="badge">En línea</span></p>
            </div>
            <p>📅 Fecha y hora del servidor: ${new Date().toLocaleString('es-ES')}</p>
            <hr>
            <small>🔗 Formato requerido: +34 654 827 120</small>
          </div>
        </body>
      </html>
    `)
  } catch (error) {
    next(error)
  }
})

// BUSCAR CONTACTOS
app.get('/api/persons/search/:query', async (req, res, next) => {
  try {
    const query = req.params.query
    const persons = await Person.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { number: { $regex: query.replace(/[\s-]/g, ''), $options: 'i' } }
      ]
    }).sort({ name: 1 })
    
    res.json(persons)
  } catch (error) {
    next(error)
  }
})

// ================= MANEJO DE ERRORES =================

// Middleware para rutas no encontradas
const unknownEndpoint = (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint no encontrado',
    message: `El endpoint ${req.method} ${req.path} no existe`,
    endpointsDisponibles: [
      'GET /api/persons',
      'GET /api/persons/:id',
      'POST /api/persons',
      'PUT /api/persons/:id',
      'PATCH /api/persons/:id',
      'DELETE /api/persons/:id',
      'GET /api/persons/search/:query',
      'GET /info'
    ]
  })
}
app.use(unknownEndpoint)

// Middleware global de errores
const errorHandler = (error, req, res, next) => {
  console.error('❌ Error:', error.message)
  
  if (error.name === 'CastError') {
    return res.status(400).json({ 
      error: 'ID inválido',
      message: 'El ID proporcionado no es válido'
    })
  }
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Error de validación',
      message: error.message
    })
  }
  
  if (error.name === 'MongoServerError' && error.code === 11000) {
    return res.status(400).json({ 
      error: 'Error de duplicado',
      message: 'Ya existe una persona con ese nombre en la agenda'
    })
  }
  
  // Error genérico del servidor
  console.error('💥 Error no manejado:', error)
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: 'Algo salió mal en el servidor'
  })
}
app.use(errorHandler)

// ================= INICIAR SERVIDOR =================
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`)
  console.log(`📍 http://localhost:${PORT}`)
  console.log(`📖 Información de la agenda: http://localhost:${PORT}/info`)
  console.log('📞 Formato de teléfono requerido: +34 654 827 120')
})

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('Señal SIGTERM recibida: cerrando servidor HTTP')
  server.close(() => {
    console.log('Servidor HTTP cerrado')
    mongoose.connection.close(false, () => {
      console.log('Conexión a MongoDB cerrada')
      process.exit(0)
    })
  })
})

module.exports = app