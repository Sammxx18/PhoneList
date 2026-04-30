import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import notes from './services/persons'



ReactDOM.createRoot(document.getElementById('root')).render(
  <App persons={notes} />
)