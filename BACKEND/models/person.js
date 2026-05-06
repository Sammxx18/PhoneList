const mongoose = require('mongoose')

const personSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
    maxlength: [50, 'El nombre no puede tener más de 50 caracteres'],
    trim: true,
    unique: true
  },
  number: {
    type: String,
    required: [true, 'El número de teléfono es obligatorio'],
    validate: {
      validator: function(v) {
        // Validación estricta: +XX XXX XXX XXX
        const strictPattern = /^\+\d{2}\s\d{3}\s\d{3}\s\d{3}$/
        return strictPattern.test(v)
      },
      message: props => `"${props.value}" no es un número válido. Usa el formato: +34 654 827 120`
    }
  },
  countryCode: {
    type: String,
    required: [true, 'El código de país es obligatorio'],
    default: '+34'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// Middleware simple para actualizar la fecha
personSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() })
  next()
})

// Transformación para JSON
personSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('Person', personSchema)