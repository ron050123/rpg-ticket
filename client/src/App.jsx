import { Routes, Route, Navigate } from 'react-router-dom'
import LoginView from './views/LoginView'
import BattleView from './views/BattleView'
import { AuthProvider, useAuth } from './context/AuthContext'

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <div className="container" style={{ width: '100%' }}>
        <Routes>
          <Route path="/login" element={<LoginView />} />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <BattleView />
            </PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </AuthProvider>
  )
}

export default App
