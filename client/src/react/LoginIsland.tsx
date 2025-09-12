import React, { useState } from "react";
import { auth } from "../config/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";

export default function LoginIsland({ onLoggedIn, onShowChangelog }: { onLoggedIn: () => void; onShowChangelog?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showRecover, setShowRecover] = useState(false);

  async function submitLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); 
    setErr(null);
    const fd = new FormData(e.target as HTMLFormElement);
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    try {
      if (!email || !password) throw new Error("Missing credentials");
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      if (!user.emailVerified) {
        throw new Error("You must verify your email before logging in.");
      }
      
      const token = await user.getIdToken();
      localStorage.setItem("auth_token", token);
      onLoggedIn();
    } catch (ex: any) {
      let message = "Login failed.";
      switch (ex.code) {
        case "auth/user-not-found":
        case "auth/wrong-password":
          message = "Incorrect email or password.";
          break;
        case "auth/invalid-email":
          message = "Invalid email format.";
          break;
        case "auth/too-many-requests":
          message = "Too many failed attempts. Try again later.";
          break;
        case "auth/email-not-verified":
          message = "You must verify your email before logging in.";
          break;
        default:
          message = ex?.message || "Login failed.";
      }
      setErr(message);
    } finally {
      setLoading(false);
    }
  }

  async function submitCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); 
    setErr(null);
    const fd = new FormData(e.target as HTMLFormElement);
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    const confirmPassword = String(fd.get("confirmPassword") || "");
    try {
      if (!email || !password || !confirmPassword) throw new Error("Missing credentials");
      if (password !== confirmPassword) throw new Error("Passwords don't match");
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await sendEmailVerification(user);
      setErr("Account created! Please check your email to verify your account before logging in.");
      setShowCreate(false);
    } catch (ex: any) {
      let message = "Account creation failed.";
      switch (ex.code) {
        case "auth/email-already-in-use":
          message = "An account with this email already exists.";
          break;
        case "auth/invalid-email":
          message = "Invalid email format.";
          break;
        case "auth/weak-password":
          message = "Password is too weak (minimum 6 characters).";
          break;
        case "auth/operation-not-allowed":
          message = "Account creation is disabled. Contact support.";
          break;
        default:
          message = ex?.message || "Account creation failed.";
      }
      setErr(message);
    } finally {
      setLoading(false);
    }
  }

  async function submitRecover(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); 
    setErr(null);
    const fd = new FormData(e.target as HTMLFormElement);
    const email = String(fd.get("email") || "");
    try {
      if (!email) throw new Error("Email required");
      
      await sendPasswordResetEmail(auth, email);
      setErr("Recovery email sent! Check your inbox.");
      setShowRecover(false);
    } catch (ex: any) {
      let message = "Recovery failed.";
      switch (ex.code) {
        case "auth/user-not-found":
          message = "No account found with this email address.";
          break;
        case "auth/invalid-email":
          message = "Invalid email format.";
          break;
        case "auth/too-many-requests":
          message = "Too many requests. Try again later.";
          break;
        default:
          message = ex?.message || "Recovery failed.";
      }
      setErr(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="login-page-container" className="loaded">
      <div id="login-wrapper">
        
        <div id="floater-connecting" className={`modal ${loading ? 'show' : 'hide'}`}>
          <div className="modal-header">Information</div>
          <div className="modal-body">
            <div className="modal-center">
              <span>{loading ? 'Connecting...' : ''}</span>
            </div>
          </div>
        </div>

        <div id="pre-login-wrapper" className={!showCreate && !showRecover ? 'show' : 'hide'}>
          <div className="auth-banner">
            <img src="/png/banner.png" alt="Game Logo" />
          </div>

          <div id="floater-enter">
            <form onSubmit={submitLogin}>
              <label htmlFor="user-username">Email:</label>
              <input 
                className="password-input" 
                name="email" 
                autoComplete="username" 
                id="user-username" 
                type="text" 
                placeholder="Account Email"
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

            <hr className="btn-space" />
            <p className="register-text">
              <span className="register-line">
                Don't have an account??
                <a 
                  className="register-link clickable" 
                  onClick={() => setShowCreate(true)}
                >
                  Register!
                </a>
              </span>
              <span className="register-line">
                Forgot your account?
                <a 
                  className="register-link clickable" 
                  onClick={() => setShowRecover(true)}
                >
                  Recover!
                </a>
              </span>
            </p>
            
            {onShowChangelog && (
              <div className="changelog-button-container">
                <button 
                  className="btn-border btn-gold changelog-button" 
                  onClick={onShowChangelog}
                >
                  📋 View Changelog
                </button>
              </div>
            )}
          </div>
        </div>
      
        <div id="floater-create" className={showCreate ? 'show' : 'hide'}>
          <form onSubmit={submitCreate}>
            <label htmlFor="create-username">Email:</label>
            <input 
              className="password-input" 
              id="create-username" 
              name="email"
              type="email" 
              placeholder="Email"
              required
            />
            
            <label htmlFor="create-password">Password:</label>
            <input 
              className="password-input" 
              id="create-password" 
              name="password"
              type="password" 
              placeholder="Password"
              required
            />
          
            <label htmlFor="create-confirm-password">Confirm Password:</label>
            <input 
              className="password-input" 
              id="create-confirm-password" 
              name="confirmPassword"
              type="password" 
              placeholder="Confirm Password"
              required
            />
          
            <button 
              id="create-account-close" 
              className="btn-primary btn-space" 
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>
        </div>

        <div id="floater-recover" className={showRecover ? 'show' : 'hide'}>
          <form onSubmit={submitRecover}>
            <label htmlFor="recover-email">Recover Account:</label>
            <input 
              className="password-input" 
              id="recover-email" 
              name="email"
              type="email" 
              placeholder="Email"
              required
            />
            <button 
              id="recover-account-button" 
              className="btn-primary btn-space" 
              type="submit"
              disabled={loading}
            >
              {loading ? "Sending..." : "Recover"}
            </button>
          </form>
        </div>

        <div className="auth-footer">
          <div id="auth-error" className="input-error">
            {err}
          </div>
        </div>

        <button 
          id="auth-back-button" 
          className={`btn-round back-link ${(showCreate || showRecover) ? 'show' : 'hide'}`}
          type="button"
          onClick={() => {
            setShowCreate(false);
            setShowRecover(false);
            setErr(null);
          }}
        >
          ←
        </button>
      </div>

      {/* Post-login wrapper - required by LoginFlowManager */}
      <div id="post-login-wrapper" className="hide">
        {/* Topbar: Shows user info */}
        <div id="post-login-topbar" className="topbar">
          <div className="user-info">
            <div className="user-details">
              <div className="user-meta">
                <span id="account-type">Normal Account</span>
                <span id="diamond-count">💎 0</span>
              </div>
            </div>
          </div>
          
          <div className="topbar-center">
            <button className="btn-border btn-gold" id="topbar-play-btn">Play</button>
            <button className="btn-border btn-gold" id="topbar-news-btn">News</button>
          </div>

          {/* Right: Donate Button */}
          <div className="topbar-right">
            <button className="btn-border btn-white special" id="donate-button">Donate</button>
          </div>
        </div>
      
        {/* Body below topbar */}
        <div id="post-login-body" className="post-login-body">
          
          {/* Character Selector */}
          <div id="character-selector" className="modal">
            <h2>Select Character</h2>
            <hr />
            <div className="character-container">
              <div id="character-list" className="character-grid"></div>
            </div>
            <hr />
            <button id="enter-game-button" className="btn-primary go-button">GO!</button>
          </div>

        </div>
      
        {/* Asset Download Progress */}
        <div id="download-progress" className="download-progress">
          <div>Downloading game assets...</div>
          <div className="progress-container">
            <div id="download-progress-bar" className="progress-bar"></div>
          </div>
          <div id="download-status">0%</div>
        </div>
      
      </div>
      
      {/* Changelog container - required by LoginFlowManager */}
      <div id="changelog-container" className="changelog-container">
        <div className="changelog-section">
          <div id="changelog-content" className="changelog-content"></div>
        </div>
      </div>

      {/* Build info */}
      <div className="build-info">
        Build: <span id="client-version"></span> <span id="data-assets">⚪</span>
      </div>
    </div>
  );
}
