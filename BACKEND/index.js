require('dotenv').config()

const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const mongoose = require('mongoose')

const Person = require('./models/person')

const app = express()

// 🔥 Mongo connection
const url = process.env.MONGODB_URI

mongoose.set('strictQuery', false)

mongoose.connect(url)
  .then(() => console.log('connected to MongoDB'))
  .catch(err => console.log('Mongo error:', err))

// middleware
app.use(cors())
app.use(express.json())
app.use(express.static('dist'))

morgan.token('body', req => JSON.stringify(req.body))
app.use(morgan(':method :url :status :res[content-length] - :response-time ms :body'))

// ================= ROUTES =================

// GET ALL
app.get('/api/persons', (req, res) => {
  Person.find({}).then(persons => res.json(persons))
})

// GET BY ID
app.get('/api/persons/:id', (req, res) => {
  Person.findById(req.params.id)
    .then(person => {
      if (person) res.json(person)
      else res.status(404).end()
    })
    .catch(() => res.status(400).json({ error: 'malformatted id' }))
})

// POST
app.post('/api/persons', (req, res) => {
  const { name, number } = req.body

  if (!name || !number) {
    return res.status(400).json({ error: 'name or number missing' })
  }

  const person = new Person({ name, number })

  person.save().then(saved => res.json(saved))
})

// DELETE
app.delete('/api/persons/:id', (req, res) => {
  Person.findByIdAndDelete(req.params.id)
    .then(() => res.status(204).end())
})

// INFO
app.get('/info', async (req, res) => {
  const count = await Person.countDocuments({})
  res.send(`<p>Phonebook has info for ${count} people</p><p>${new Date()}</p>`)
})

// START SERVER
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})