import React, { useState } from 'react';

interface RegisterFormProps {
  onSubmit: (email: string, password: string, confirmPassword: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  onBack: () => void;
}

export default function RegisterForm({ onSubmit, loading, error, onBack }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) return;
    await onSubmit(email, password, confirmPassword);
  };

  return (
    <div id="floater-register">
      <h2>Create Account</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="register-email">Email:</label>
        <input 
          className="password-input" 
          name="email" 
          id="register-email" 
          type="email" 
          placeholder="Your Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <label htmlFor="register-password">Password:</label>
        <input 
          className="password-input" 
          name="password" 
          id="register-password" 
          type="password" 
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        
        <label htmlFor="register-confirm">Confirm Password:</label>
        <input 
          className="password-input" 
          name="confirmPassword" 
          id="register-confirm" 
          type="password" 
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        
        <button 
          className="btn-primary btn-space" 
          type="submit"
          disabled={loading}
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <hr className="btn-space" />
      
    </div>
  );
}
