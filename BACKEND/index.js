require('dotenv').config()
const PORT = process.env.PORT || 3001
const URL = process.env.MONGODB_URI

const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const mongoose = require('mongoose')

const Person = require('./models/person')

const app = express()

// 🔥 Conexión a MongoDB
mongoose.set('strictQuery', false)

mongoose.connect(URL)
  .then(() => {
    console.log('✅ Connected to MongoDB')
    console.log(`📡 Server will run on port ${PORT}`)
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message)
    process.exit(1)
  })

// ================= MIDDLEWARES =================
app.use(cors())
app.use(express.json())
app.use(express.static('dist'))

// Morgan con logging de body solo para POST y PUT
morgan.token('body', (req) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    return JSON.stringify(req.body)
  }
  return ''
})
app.use(morgan(':method :url :status :res[content-length] - :response-time ms :body'))

// ================= ROUTES =================

// GET ALL - Obtener todas las personas
app.get('/api/persons', async (req, res, next) => {
  try {
    const persons = await Person.find({}).sort({ name: 1 })
    res.json(persons)
  } catch (error) {
    next(error)
  }
})

// GET BY ID - Obtener una persona específica
app.get('/api/persons/:id', async (req, res, next) => {
  try {
    const person = await Person.findById(req.params.id)
    if (person) {
      res.json(person)
    } else {
      res.status(404).json({ error: 'Person not found' })
    }
  } catch (error) {
    next(error)
  }
})

// POST - Crear una nueva persona
app.post('/api/persons', async (req, res, next) => {
  try {
    let { name, number, countryCode } = req.body

    // Validación básica
    if (!name || !number) {
      return res.status(400).json({ 
        error: 'Both name and number are required' 
      })
    }

    // Limpiar el número para la validación
    let cleanNumber = number.replace(/[\s-]/g, '')
    
    // Si el número no tiene prefijo y no se proporcionó countryCode, usar +34 por defecto
    if (!cleanNumber.startsWith('+')) {
      if (!countryCode) {
        countryCode = '+34'
      }
      // Extraer solo los dígitos del número sin prefijo
      const digitsOnly = cleanNumber.replace(/\D/g, '')
      if (digitsOnly.length === 9) {
        number = countryCode + digitsOnly
      }
    }

    // Verificar si ya existe una persona con el mismo nombre (case-insensitive)
    const existingPerson = await Person.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    })
    
    if (existingPerson) {
      return res.status(400).json({ 
        error: `Person with name "${name}" already exists`,
        existingId: existingPerson.id
      })
    }

    // Crear nueva persona
    const personData = { 
      name: name.trim(), 
      number,
      countryCode: countryCode || '+34'
    }
    
    const person = new Person(personData)
    const savedPerson = await person.save()
    
    // Devolver también la versión formateada del número
    res.status(201).json({
      ...savedPerson.toJSON(),
      originalNumber: number
    })
    
  } catch (error) {
    // Manejar errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation Error',
        details: error.message,
        fields: Object.keys(error.errors)
      })
    }
    next(error)
  }
})

// PUT - Actualizar una persona completa
app.put('/api/persons/:id', async (req, res, next) => {
  try {
    let { name, number, countryCode } = req.body

    if (!name || !number) {
      return res.status(400).json({ 
        error: 'Both name and number are required' 
      })
    }

    // Limpiar el número para la validación
    let cleanNumber = number.replace(/[\s-]/g, '')
    
    // Si el número no tiene prefijo, añadir countryCode o +34 por defecto
    if (!cleanNumber.startsWith('+')) {
      const code = countryCode || '+34'
      const digitsOnly = cleanNumber.replace(/\D/g, '')
      if (digitsOnly.length === 9) {
        number = code + digitsOnly
      }
    }

    // Verificar si el nuevo nombre ya existe en otra persona
    const existingPerson = await Person.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: req.params.id }
    })
    
    if (existingPerson) {
      return res.status(400).json({ 
        error: `Person with name "${name}" already exists`,
        existingId: existingPerson.id
      })
    }

    const updatedPerson = await Person.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), number, countryCode: countryCode || '+34' },
      { 
        new: true,           // Devuelve el documento actualizado
        runValidators: true, // Ejecuta las validaciones del schema
        context: 'query'
      }
    )

    if (updatedPerson) {
      res.json(updatedPerson)
    } else {
      res.status(404).json({ error: 'Person not found' })
    }
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation Error',
        details: error.message
      })
    }
    next(error)
  }
})

// PATCH - Actualizar parcialmente (solo el número)
app.patch('/api/persons/:id', async (req, res, next) => {
  try {
    let { number, countryCode } = req.body

    if (!number) {
      return res.status(400).json({ 
        error: 'Number is required for partial update' 
      })
    }

    // Limpiar el número para la validación
    let cleanNumber = number.replace(/[\s-]/g, '')
    
    // Si el número no tiene prefijo, añadir countryCode o usar el existente
    if (!cleanNumber.startsWith('+')) {
      const existingPerson = await Person.findById(req.params.id)
      const code = countryCode || existingPerson?.countryCode || '+34'
      const digitsOnly = cleanNumber.replace(/\D/g, '')
      if (digitsOnly.length === 9) {
        number = code + digitsOnly
      }
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
      res.status(404).json({ error: 'Person not found' })
    }
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message })
    }
    next(error)
  }
})

// DELETE - Eliminar una persona
app.delete('/api/persons/:id', async (req, res, next) => {
  try {
    const deletedPerson = await Person.findByIdAndDelete(req.params.id)
    
    if (deletedPerson) {
      res.status(204).end()
    } else {
      res.status(404).json({ error: 'Person not found' })
    }
  } catch (error) {
    next(error)
  }
})

// GET INFO - Información de la agenda
app.get('/info', async (req, res, next) => {
  try {
    const count = await Person.countDocuments({})
    const persons = await Person.find({}).sort({ name: 1 })
    const currentDate = new Date()
    
    // Generar lista de contactos para mostrar
    const contactsList = persons.map(p => `
      <tr>
        <td>${p.name}</td>
        <td>${p.formatPhoneNumber()}</td>
        <td><small>${p.countryCode}</small></td>
      </tr>
    `).join('')
    
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Phonebook API - Agenda Telefónica</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              padding: 20px;
            }
            .container {
              max-width: 1000px;
              margin: 0 auto;
            }
            .card {
              background: rgba(255, 255, 255, 0.95);
              border-radius: 20px;
              padding: 30px;
              margin-bottom: 20px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              backdrop-filter: blur(10px);
            }
            h1 {
              margin: 0 0 10px 0;
              color: #667eea;
              font-size: 2.5em;
            }
            .stats {
              background: linear-gradient(135deg, #667eea 20%, #764ba2 100%);
              color: white;
              padding: 20px;
              border-radius: 15px;
              margin: 20px 0;
            }
            .stat-number {
              font-size: 2em;
              font-weight: bold;
            }
            .badge {
              display: inline-block;
              padding: 5px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: bold;
            }
            .online {
              background: #10b981;
              color: white;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              padding: 12px;
              text-align: left;
              border-bottom: 1px solid #e0e0e0;
            }
            th {
              background-color: #f8f9fa;
              color: #667eea;
              font-weight: 600;
            }
            tr:hover {
              background-color: #f8f9fa;
            }
            .date {
              font-family: monospace;
              font-size: 14px;
              color: #666;
              margin-top: 15px;
            }
            .endpoints {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 10px;
              font-family: monospace;
              font-size: 13px;
            }
            .endpoints code {
              background: #e0e0e0;
              padding: 2px 6px;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <h1>📞 Phonebook API</h1>
              <p>Agenda telefónica con soporte para números internacionales</p>
              
              <div class="stats">
                <p><strong>📊 Estadísticas</strong></p>
                <p><span class="stat-number">${count}</span> contactos en la agenda</p>
                <p>🟢 Estado: <span class="badge online">Online</span></p>
              </div>
              
              <h3>📋 Lista de Contactos</h3>
              <table>
                <thead>
                  <tr><th>Nombre</th><th>Teléfono</th><th>Prefijo</th></tr>
                </thead>
                <tbody>
                  ${contactsList || '<tr><td colspan="3" style="text-align:center">No hay contactos aún</td></tr>'}
                </tbody>
              </table>
              
              <p class="date">📅 Última actualización: ${currentDate.toLocaleString('es-ES')}</p>
              
              <hr style="margin: 20px 0">
              
              <div class="endpoints">
                <strong>🔗 Endpoints disponibles:</strong><br>
                <code>GET</code> /api/persons - Listar todos los contactos<br>
                <code>GET</code> /api/persons/:id - Obtener contacto específico<br>
                <code>POST</code> /api/persons - Crear nuevo contacto<br>
                <code>PUT</code> /api/persons/:id - Actualizar contacto completo<br>
                <code>PATCH</code> /api/persons/:id - Actualizar número únicamente<br>
                <code>DELETE</code> /api/persons/:id - Eliminar contacto<br>
              </div>
            </div>
          </div>
        </body>
      </html>
    `)
  } catch (error) {
    next(error)
  }
})

// GET - Buscar contactos por nombre o número
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
    error: 'Unknown endpoint',
    message: `The endpoint ${req.method} ${req.path} does not exist`,
    availableEndpoints: [
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
      error: 'Malformatted ID',
      message: 'The provided ID is not a valid MongoDB ObjectId'
    })
  }
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation Error',
      message: error.message,
      fields: Object.keys(error.errors)
    })
  }
  
  if (error.name === 'MongoServerError' && error.code === 11000) {
    return res.status(400).json({ 
      error: 'Duplicate Key Error',
      message: 'A person with this name already exists in the database'
    })
  }
  
  // Error genérico del servidor
  console.error('💥 Unhandled error:', error)
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: 'Something went wrong on the server'
  })
}
app.use(errorHandler)

// ================= INICIAR SERVIDOR =================
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📍 http://localhost:${PORT}`)
  console.log(`📖 Phonebook Info: http://localhost:${PORT}/info`)
  console.log(`📞 Formatos de teléfono aceptados:`)
  console.log(`   • +34 604 902 102`)
  console.log(`   • +34 604902102`)
  console.log(`   • 604902102 (asume +34)`)
  console.log(`   • +44 20 7946 0958 (internacional)`)
})

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server')
  server.close(() => {
    console.log('HTTP server closed')
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed')
      process.exit(0)
    })
  })
})

module.exports = app