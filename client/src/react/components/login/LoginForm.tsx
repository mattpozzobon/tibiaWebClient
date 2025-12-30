import React, { useState } from 'react';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  onShowRegister?: () => void;
  onShowRecover?: () => void;
}

export default function LoginForm({ onSubmit, loading, error, onShowRegister, onShowRecover }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    await onSubmit(email, password);
  };

  return (
    <div id="floater-enter">
      <form onSubmit={handleSubmit}>
        <label htmlFor="user-username">Email:</label>
        <input 
          className="password-input" 
          name="email" 
          autoComplete="username" 
          id="user-username" 
          type="text" 
          placeholder="Account Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="user-password">Password:</label>
        <input 
          className="password-input" 
          name="password" 
          autoComplete="current-password" 
          id="user-password" 
          type="password" 
          placeholder="Account Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button 
          id="enter-game" 
          className="btn-primary btn-space" 
          type="submit"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <hr className="btn-space" />
      <p className="register-text">
        <span className="register-line">
          Don't have an account??
          <a className="register-link clickable" onClick={onShowRegister}>
            Register!
          </a>
        </span>
        <span className="register-line">
          Forgot your account?
          <a className="register-link clickable" onClick={onShowRecover}>
            Recover!
          </a>
        </span>
      </p>
    </div>
  );
}
