const express = require('express')
const morgan = require('morgan')
const app = express()

app.use(express.static('dist'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Token personalizado para mostrar el body
morgan.token('body', (req) => JSON.stringify(req.body))

// Usar morgan (después de express.json)
app.use(morgan(':method :url :status :res[content-length] - :response-time ms :body'))

let persons = [
  { 
    id: 1,
    name: "Arto Hellas", 
    number: "040-123456"
  },
  { 
    id: 2,
    name: "Ada Lovelace", 
    number: "39-44-5323523"
  },
  { 
    id: 3,
    name: "Dan Abramov", 
    number: "12-43-234345"
  },
  { 
    id: 4,
    name: "Mary Poppendieck", 
    number: "39-23-6423122"
  }
]

// Obtener todas las personas
app.get('/api/persons', (req, res) => {
  res.json(persons)
})

// Obtener una persona por id
app.get('/api/persons/:id', (req, res) => {
  const id = Number(req.params.id)
  const person = persons.find(p => p.id === id)

  if (person) {
    res.json(person)
  } else {
    res.status(404).json({ error: 'person not found' })
  }
})

// Eliminar una persona
app.delete('/api/persons/:id', (req, res) => {
  const id = Number(req.params.id)

  const exists = persons.some(p => p.id === id)
  if (!exists) {
    return res.status(404).json({ error: 'person not found' })
  }

  persons = persons.filter(p => p.id !== id)
  res.status(204).end()
})

// Generar nuevo ID
const generateId = () => {
  const maxId = persons.length > 0
    ? Math.max(...persons.map(p => p.id))
    : 0
  return maxId + 1
}

// Añadir una persona
app.post('/api/persons', (req, res) => {
  const { name, number } = req.body

  if (!name || !number) {
    return res.status(400).json({
      error: 'name or number missing'
    })
  }

  const existingPerson = persons.find(p => p.name === name)
  if (existingPerson) {
    return res.status(400).json({
      error: 'name must be unique'
    })
  }

  const person = {
    id: generateId(),
    name,
    number
  }

  persons = persons.concat(person)
  res.status(201).json(person)
})

// Info del phonebook
app.get('/info', (req, res) => {
  const total = persons.length
  const date = new Date()

  res.send(`
    <p>Phonebook has info for ${total} people</p>
    <p>${date}</p>
  `)
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})