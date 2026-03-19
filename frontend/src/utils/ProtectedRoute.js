import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from './auth';

const ProtectedRoute = ({ component: Component }) => {
  return isAuthenticated() ? Component : <Navigate to="/" />;
};

export default ProtectedRoute;
