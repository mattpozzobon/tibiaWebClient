import React, { useState } from 'react';

interface RecoverFormProps {
  onSubmit: (email: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  onBack: () => void;
}

export default function RecoverForm({ onSubmit, loading, error, onBack }: RecoverFormProps) {
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    await onSubmit(email);
  };

  return (
    <div id="floater-recover">
      <h2>Recover Account</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="recover-email">Email:</label>
        <input 
          className="password-input" 
          name="email" 
          id="recover-email" 
          type="email" 
          placeholder="Your Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <button 
          className="btn-primary btn-space" 
          type="submit"
          disabled={loading}
        >
          {loading ? "Sending Recovery..." : "Send Recovery Email"}
        </button>
      </form>

      {error && (
        <div className={error.includes('sent') ? 'success-message' : 'error-message'}>
          {error}
        </div>
      )}

      <hr className="btn-space" />
      
    </div>
  );
}
