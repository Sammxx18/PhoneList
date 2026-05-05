const mongoose = require('mongoose')

// 1. Validar argumentos
if (process.argv.length < 3) {
  console.log('give password as argument')
  process.exit(1)
}

const password = process.argv[2]

// 2. URL (IMPORTANTE: usa tu cluster)
const url = `mongodb://Sammxx:${password}@ac-zrgxcky-shard-00-00.ilh4eyq.mongodb.net:27017,ac-zrgxcky-shard-00-01.ilh4eyq.mongodb.net:27017,ac-zrgxcky-shard-00-02.ilh4eyq.mongodb.net:27017/PhoneList?ssl=true&replicaSet=atlas-wcju9u-shard-0&authSource=admin&appName=Cluster0`

mongoose.set('strictQuery', false)
mongoose.connect(url)

// 3. Schema
const personSchema = new mongoose.Schema({
  name: String,
  number: String,
})

// 4. Modelo
const Person = mongoose.model('Person', personSchema)

// ===============================
// 🔥 CASO 1: SOLO PASSWORD → MOSTRAR DATOS
// ===============================
if (process.argv.length === 3) {
  Person.find({}).then(result => {
    console.log('phonebook:')

    result.forEach(person => {
      console.log(`${person.name} ${person.number}`)
    })

    mongoose.connection.close()
  })

// ===============================
// 🔥 CASO 2: AÑADIR PERSONA
// ===============================
} else if (process.argv.length === 5) {

  const name = process.argv[3]
  const number = process.argv[4]

  const person = new Person({
    name: name,
    number: number,
  })

  person.save().then(() => {
    console.log(`added ${name} number ${number} to phonebook`)
    mongoose.connection.close()
  })

} else {
  console.log('wrong number of arguments')
  mongoose.connection.close()
}