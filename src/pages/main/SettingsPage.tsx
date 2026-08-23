import React from 'react'
import { Navigate } from 'react-router-dom'

/**
 * Settings Page Route Alias
 * Redirects to the unified Profile & Settings dashboard at /profile.
 */
const SettingsPage: React.FC = () => {
  return <Navigate to="/profile" replace />
}

export default SettingsPage
