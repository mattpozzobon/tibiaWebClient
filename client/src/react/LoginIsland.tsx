import React, { useState } from "react";
import { auth } from "../config/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";
import LoginForm from "./components/login/LoginForm";
import RegisterForm from "./components/login/RegisterForm";
import RecoverForm from "./components/login/RecoverForm";

export default function LoginIsland({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showRecover, setShowRecover] = useState(false);

  async function submitLogin(email: string, password: string, rememberMe: boolean) {
    setLoading(true); 
    setErr(null);
    try {
      if (!email || !password) throw new Error("Missing credentials");
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      if (!user.emailVerified) {
        throw new Error("You must verify your email before logging in.");
      }
      
      const token = await user.getIdToken();
      // Always save token to sessionStorage for current session (clears on tab close)
      sessionStorage.setItem("auth_token", token);
      // Only persist to localStorage if "Remember me" is checked
      if (rememberMe) {
        localStorage.setItem("auth_token", token);
      } else {
        // Remove token from localStorage if it exists and user doesn't want to remember
        localStorage.removeItem("auth_token");
      }
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

  async function submitCreate(email: string, password: string, confirmPassword: string) {
    setLoading(true); 
    setErr(null);
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

  async function submitRecover(email: string) {
    setLoading(true); 
    setErr(null);
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
    <div id="login-base-container">
      {/* Emperia Logo - Always at the top */}
      <div className="login-header">
        <div className="auth-banner">
          <img src="/png/banner.png" alt="Emperia Logo" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="login-content">
        <div id="floater-connecting" className={`modal ${loading ? 'show' : 'hide'}`}>
          <div className="modal-header">Information</div>
          <div className="modal-body">
            <div className="modal-center">
              <span>{loading ? 'Connecting...' : ''}</span>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div id="pre-login-wrapper" className={!showCreate && !showRecover ? 'show' : 'hide'}>
          <LoginForm 
            onSubmit={submitLogin}
            loading={loading}
            error={err}
            onShowRegister={() => setShowCreate(true)}
            onShowRecover={() => setShowRecover(true)}
          />
        </div>
      
        {/* Register Form */}
        <div id="create-account-wrapper" className={showCreate ? 'show' : 'hide'}>
          <RegisterForm 
            onSubmit={submitCreate}
            loading={loading}
            error={err}
            onBack={() => setShowCreate(false)}
          />
        </div>

        {/* Recover Form */}
        <div id="recover-account-wrapper" className={showRecover ? 'show' : 'hide'}>
          <RecoverForm 
            onSubmit={submitRecover}
            loading={loading}
            error={err}
            onBack={() => setShowRecover(false)}
          />
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
      
    </div>
  );
}
