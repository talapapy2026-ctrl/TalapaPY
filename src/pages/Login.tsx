import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { getMozos } from '../store';
import type { Mozo } from '../types';
import { ChefHat, ShieldAlert, KeyRound, User, Lock, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mozos, setMozos] = useState<Mozo[]>([]);
  
  // Tabs: 'admin' | 'mozo' | 'cocina'
  const initialRole = searchParams.get('role') === 'admin' ? 'admin' : (searchParams.get('role') === 'cocina' ? 'cocina' : 'mozo');
  const [role, setRole] = useState<'admin' | 'mozo' | 'cocina'>(initialRole);

  // Form states
  const [adminPassword, setAdminPassword] = useState('');
  const [cocinaPassword, setCocinaPassword] = useState('');
  const [selectedMozoId, setSelectedMozoId] = useState('');
  const [mozoPin, setMozoPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showCocinaPassword, setShowCocinaPassword] = useState(false);
  const [showMozoPin, setShowMozoPin] = useState(false);

  useEffect(() => {
    setMozos(getMozos());
  }, []);

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    // Default admin credential
    if (adminPassword === 'admin') {
      localStorage.setItem('talapa_admin_logged', 'true');
      navigate('/admin');
    } else {
      setErrorMessage('Contraseña incorrecta. Intente nuevamente.');
    }
  };

  const handleCocinaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    const correctPassword = localStorage.getItem('talapa_cocina_password') || 'cocina';
    if (cocinaPassword === correctPassword) {
      localStorage.setItem('talapa_cocina_logged', 'true');
      navigate('/admin');
    } else {
      setErrorMessage('Contraseña incorrecta. Intente nuevamente.');
    }
  };

  const handleMozoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!selectedMozoId) {
      setErrorMessage('Por favor seleccione su nombre.');
      return;
    }

    const chosenMozo = mozos.find(m => m.id === selectedMozoId);
    if (!chosenMozo) {
      setErrorMessage('Mozo no encontrado.');
      return;
    }

    if (chosenMozo.code === mozoPin) {
      localStorage.setItem('talapa_logged_mozo_id', chosenMozo.id);
      navigate('/');
    } else {
      setErrorMessage('Código PIN incorrecto.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e1e1e 0%, #121212 100%)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '40px 30px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        textAlign: 'center'
      }}>
        {/* Title Branding */}
        <div style={{
          background: 'var(--primary-red)',
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 15px auto'
        }}>
          <ChefHat size={35} color="white" />
        </div>
        <h1 style={{ fontFamily: 'Oswald', fontSize: '2.2rem', marginBottom: '5px', color: 'var(--secondary-yellow)', letterSpacing: '1px' }}>
          TALAPA BURGER
        </h1>
        <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '30px' }}>Sistema de Pedidos e Impresión de Comandas</p>

        {/* Role Toggle Tabs */}
        <div style={{
          display: 'flex',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '8px',
          padding: '4px',
          marginBottom: '25px',
          gap: '2px'
        }}>
          <button
            onClick={() => { setRole('mozo'); setErrorMessage(''); }}
            style={{
              flex: 1,
              padding: '10px 5px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              background: role === 'mozo' ? 'var(--secondary-yellow)' : 'transparent',
              color: role === 'mozo' ? '#111' : '#ccc',
              fontSize: '0.85rem'
            }}
          >
            Acceso Mozo
          </button>
          <button
            onClick={() => { setRole('cocina'); setErrorMessage(''); }}
            style={{
              flex: 1,
              padding: '10px 5px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              background: role === 'cocina' ? 'var(--secondary-yellow)' : 'transparent',
              color: role === 'cocina' ? '#111' : '#ccc',
              fontSize: '0.85rem'
            }}
          >
            Cocina
          </button>
          <button
            onClick={() => { setRole('admin'); setErrorMessage(''); }}
            style={{
              flex: 1,
              padding: '10px 5px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              background: role === 'admin' ? 'var(--secondary-yellow)' : 'transparent',
              color: role === 'admin' ? '#111' : '#ccc',
              fontSize: '0.85rem'
            }}
          >
            Administración
          </button>
        </div>

        {/* Error alert banner */}
        {errorMessage && (
          <div style={{
            background: 'rgba(218, 37, 29, 0.15)',
            border: '1px solid var(--primary-red)',
            borderRadius: '8px',
            color: '#ff8787',
            padding: '12px',
            fontSize: '0.85rem',
            marginBottom: '20px',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Admin Login Form */}
        {role === 'admin' && (
          <form onSubmit={handleAdminSubmit}>
            <div className="form-group" style={{ textAlign: 'left', marginBottom: '20px' }}>
              <label style={{ color: '#ccc', fontSize: '0.85rem', marginBottom: '8px', display: 'block' }}>Contraseña de Administrador</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="#888" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showAdminPassword ? "text" : "password"}
                  className="form-control"
                  placeholder="Ingrese contraseña"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  required
                  style={{
                    backgroundColor: '#2a2a2a',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    padding: '12px 40px 12px 40px',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    width: '100%'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#888',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}
                  title={showAdminPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#666', marginTop: '5px', display: 'block' }}>
                * La clave por defecto es <strong>admin</strong>
              </span>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '1.1rem', background: 'var(--primary-red)' }}
            >
              Iniciar Sesión Admin
            </button>
          </form>
        )}

        {/* Mozo Login Form */}
        {role === 'mozo' && (
          <form onSubmit={handleMozoSubmit}>
            <div className="form-group" style={{ textAlign: 'left', marginBottom: '15px' }}>
              <label style={{ color: '#ccc', fontSize: '0.85rem', marginBottom: '8px', display: 'block' }}>Seleccione su Usuario</label>
              <div style={{ position: 'relative' }}>
                <User size={18} color="#888" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <select
                  className="form-control"
                  value={selectedMozoId}
                  onChange={e => setSelectedMozoId(e.target.value)}
                  required
                  style={{
                    backgroundColor: '#2a2a2a',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    padding: '12px 12px 12px 40px',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    width: '100%'
                  }}
                >
                  <option value="">-- Seleccionar Mozo --</option>
                  {mozos.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ textAlign: 'left', marginBottom: '25px' }}>
              <label style={{ color: '#ccc', fontSize: '0.85rem', marginBottom: '8px', display: 'block' }}>Código PIN de Seguridad</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} color="#888" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showMozoPin ? "text" : "password"}
                  className="form-control"
                  placeholder="Ingrese PIN"
                  maxLength={6}
                  value={mozoPin}
                  onChange={e => setMozoPin(e.target.value)}
                  required
                  style={{
                    backgroundColor: '#2a2a2a',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    padding: '12px 40px 12px 40px',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    width: '100%'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowMozoPin(!showMozoPin)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#888',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}
                  title={showMozoPin ? "Ocultar PIN" : "Mostrar PIN"}
                >
                  {showMozoPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-secondary"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '1.1rem' }}
            >
              Iniciar Sesión Mozo
            </button>
          </form>
        )}

        {/* Cocina Login Form */}
        {role === 'cocina' && (
          <form onSubmit={handleCocinaSubmit}>
            <div className="form-group" style={{ textAlign: 'left', marginBottom: '20px' }}>
              <label style={{ color: '#ccc', fontSize: '0.85rem', marginBottom: '8px', display: 'block' }}>Contraseña de Cocina</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="#888" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showCocinaPassword ? "text" : "password"}
                  className="form-control"
                  placeholder="Ingrese contraseña"
                  value={cocinaPassword}
                  onChange={e => setCocinaPassword(e.target.value)}
                  required
                  style={{
                    backgroundColor: '#2a2a2a',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    padding: '12px 40px 12px 40px',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    width: '100%'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCocinaPassword(!showCocinaPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#888',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}
                  title={showCocinaPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showCocinaPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#666', marginTop: '5px', display: 'block' }}>
                * La clave por defecto es <strong>cocina</strong>
              </span>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '1.1rem', background: 'var(--primary-red)' }}
            >
              Iniciar Sesión Cocina
            </button>
          </form>
        )}

        <div style={{ marginTop: '25px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '15px' }}>
          <Link to="/" style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.85rem' }}>
            ← Volver a la Tienda principal
          </Link>
        </div>
      </div>
    </div>
  );
};
