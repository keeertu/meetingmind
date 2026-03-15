import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Amplify } from 'aws-amplify'

// Amplify v6 requires this explicit config shape — the old CLI JSON format won't work
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId:       'us-east-1_jURnqIcRi',
      userPoolClientId: '3ft8k8iq0pfcf9h8o6469i4ok9',
      region:           'us-east-1',
      loginWith: {
        email: true,
      },
      passwordFormat: {
        minLength:        8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers:   true,
        requireSpecialCharacters: false,
      },
      userAttributes: {
        email: { required: true },
      },
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)