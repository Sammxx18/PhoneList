import { useState, useEffect } from 'react'
import personService from './services/persons'
import './App.css'

// 🔔 Notificación
const Notification = ({ message, type }) => {
  if (!message) return null
  return <div className={type}>{message}</div>
}

// 🔍 Filtro
const Filter = ({ filter, setFilter }) => (
  <div>
    Buscar:{' '}
    <input
      value={filter}
      onChange={(e) => setFilter(e.target.value)}
    />
  </div>
)

// 👥 Lista personas (✅ SOLO UNA VEZ)
const Persons = ({ persons, handleDelete }) => (
  <ul>
    {persons.map(person => (
      <li key={person.id}>
        {person.name} {person.number}
        <button
          className="delete"
          onClick={() => handleDelete(person.id, person.name)}
        >
          Eliminar
        </button>
      </li>
    ))}
  </ul>
)

const App = () => {
  const [persons, setPersons] = useState([])
  const [newName, setNewName] = useState('')
  const [newNumber, setNewNumber] = useState('')
  const [filter, setFilter] = useState('')
  const [message, setMessage] = useState(null)
  const [type, setType] = useState(null)

  // 📥 cargar datos
  useEffect(() => {
    personService
      .getAll()
      .then(data => setPersons(data))
      .catch(() => {
        setMessage('Error al cargar datos del servidor')
        setType('error')
        setTimeout(() => setMessage(null), 3000)
      })
  }, [])

  // ➕ añadir / actualizar
  const addPersons = (event) => {
    event.preventDefault()

    if (newName === '' || newNumber === '') {
      setMessage('El campo está vacío')
      setType('error')
      setTimeout(() => setMessage(null), 3000)
      return
    }

    const existingPerson = persons.find(
      p => p.name.toLowerCase() === newName.toLowerCase()
    )

    const numberExists = persons.find(
      p => p.number === newNumber
    )

    if (numberExists) {
      setMessage(`El número ${newNumber} ya está asignado a ${numberExists.name}`)
      setType('error')
      setTimeout(() => setMessage(null), 4000)
      return
    }

    if (existingPerson) {
      const confirmUpdate = window.confirm(
        `${newName} ya existe. ¿Quieres actualizar el número?`
      )

      if (!confirmUpdate) return

      const updatedPerson = {
        ...existingPerson,
        number: newNumber
      }

      personService
        .update(existingPerson.id, updatedPerson)
        .then(returned => {
          setPersons(
            persons.map(p =>
              p.id !== existingPerson.id ? p : returned
            )
          )

          setMessage(`Número actualizado de ${returned.name}`)
          setType('success')
          setTimeout(() => setMessage(null), 3000)

          setNewName('')
          setNewNumber('')
        })
        .catch(() => {
          setMessage('Error al actualizar contacto')
          setType('error')
          setTimeout(() => setMessage(null), 3000)
        })

      return
    }

    const newPerson = {
      name: newName,
      number: newNumber
    }

    personService
      .create(newPerson)
      .then(returned => {
        setPersons(persons.concat(returned))
        setNewName('')
        setNewNumber('')

        setMessage(`Añadido ${returned.name}`)
        setType('success')
        setTimeout(() => setMessage(null), 3000)
      })
      .catch(() => {
        setMessage('Error al añadir persona')
        setType('error')
        setTimeout(() => setMessage(null), 3000)
      })
  }

  // 🗑️ delete
  const handleDelete = (id, name) => {
    if (!window.confirm(`¿Eliminar a ${name}?`)) return

    personService
      .remove(id)
      .then(() => {
        setPersons(persons.filter(p => p.id !== id))

        setMessage(`Eliminado ${name}`)
        setType('success')
        setTimeout(() => setMessage(null), 3000)
      })
      .catch(() => {
        setMessage(`${name} ya no existe en el servidor`)
        setType('error')

        setPersons(persons.filter(p => p.id !== id))
        setTimeout(() => setMessage(null), 3000)
      })
  }

  const personToShow = persons.filter(person =>
    person.name.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="container">
      <h2>Phonelist</h2>

      <Notification message={message} type={type} />

      <Filter filter={filter} setFilter={setFilter} />

      <form onSubmit={addPersons}>
        <h2>Añadir nuevo teléfono</h2>

        Nombre:{' '}
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <br />

        Número:{' '}
        <input
          value={newNumber}
          onChange={(e) => setNewNumber(e.target.value)}
        />

        <div>
          <button type="submit">Añadir</button>
        </div>
      </form>

      <h2>Contactos</h2>

      <Persons persons={personToShow} handleDelete={handleDelete} />
    </div>
  )
}

export default App