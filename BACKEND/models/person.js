const mongoose = require('mongoose')

const personSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    minlength: [3, 'Name must be at least 3 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters'],
    trim: true,
    unique: true
  },
  number: {
    type: String,
    required: [true, 'Phone number is required'],
    validate: {
      validator: function(v) {
        // Validación para números de teléfono con formato internacional
        // Formatos aceptados:
        // +34 604 902 102
        // +34 604902102
        // +34-604-902-102
        // 604902102 (sin prefijo, asume +34)
        // 604 902 102
        // +44 20 7946 0958 (otros prefijos internacionales)
        
        // Eliminar espacios y guiones para la validación base
        const cleanNumber = v.replace(/[\s-]/g, '')
        
        // Patrón para números internacionales con prefijo (+XX)
        const internationalPattern = /^\+\d{1,3}\d{6,12}$/
        
        // Patrón para números nacionales (asumimos +34 si no tiene prefijo)
        const nationalPattern = /^\d{9}$/
        
        // Patrón para formato con espacios exacto: +34 604 902 102
        const spacedPattern = /^\+\d{1,3}(\s\d{3}){2}\s\d{3}$|^\+\d{1,3}(\s\d{2,4}){2,3}$/
        
        if (internationalPattern.test(cleanNumber)) {
          return true
        }
        
        if (nationalPattern.test(cleanNumber)) {
          return true
        }
        
        if (spacedPattern.test(v)) {
          return true
        }
        
        return false
      },
      message: props => `${props.value} is not a valid phone number! 
        Examples: +34 604 902 102, +34 604902102, 604902102, +44 20 7946 0958`
    }
  },
  countryCode: {
    type: String,
    default: '+34',
    enum: ['+34', '+44', '+1', '+33', '+49', '+351', '+39'] // Prefijos más comunes
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

// Método para formatear el número de teléfono de manera consistente
personSchema.methods.formatPhoneNumber = function() {
  // Si ya tiene el prefijo y está en formato con espacios, devolver así
  if (this.number.includes('+') && this.number.includes(' ')) {
    return this.number
  }
  
  // Limpiar el número de espacios y guiones
  let cleanNumber = this.number.replace(/[\s-]/g, '')
  
  // Si no tiene prefijo internacional, añadir el countryCode
  if (!cleanNumber.startsWith('+')) {
    cleanNumber = this.countryCode + cleanNumber
  }
  
  // Formatear: +34 604 902 102
  // Asumiendo que después del prefijo vienen 9 dígitos
  const prefixMatch = cleanNumber.match(/^(\+\d{1,3})(\d{3})(\d{3})(\d{3})$/)
  if (prefixMatch) {
    return `${prefixMatch[1]} ${prefixMatch[2]} ${prefixMatch[3]} ${prefixMatch[4]}`
  }
  
  // Si no se pudo formatear, devolver el número original
  return this.number
}

// Middleware para formatear el número antes de guardar
personSchema.pre('save', function(next) {
  // Formatear el número a un formato estándar
  let cleanNumber = this.number.replace(/[\s-]/g, '')
  
  // Si no tiene prefijo internacional, añadir el countryCode
  if (!cleanNumber.startsWith('+')) {
    cleanNumber = this.countryCode + cleanNumber
  }
  
  // Formatear para almacenar de manera consistente: +34604902102 (sin espacios)
  this.number = cleanNumber
  this.updatedAt = new Date()
  next()
})

// Middleware para actualizar el updatedAt en findOneAndUpdate
personSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() })
  next()
})

// Transformación para JSON - incluir versión formateada
personSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    returnedObject.formattedNumber = document.formatPhoneNumber()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('Person', personSchema)