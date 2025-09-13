import React from 'react'
import { AuthProvider } from './contexts/AuthContext';
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

const root = createRoot(document.getElementById('root'))
root.render(<AuthProvider><AuthProvider><App /></AuthProvider></AuthProvider>)

