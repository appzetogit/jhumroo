import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'

// Safe DOM monkey-patches to prevent react unmount crashes from external DOM modifications (like Instacam wrapper/browser extensions)
const originalRemoveChild = Node.prototype.removeChild;
Node.prototype.removeChild = function (child) {
  if (child && child.parentNode === this) {
    return originalRemoveChild.call(this, child);
  }
  if (child && child.parentNode) {
    try {
      return originalRemoveChild.call(child.parentNode, child);
    } catch (e) {
      console.warn("Bypassed removeChild mismatch:", e);
    }
  }
  return child;
};

const originalInsertBefore = Node.prototype.insertBefore;
Node.prototype.insertBefore = function (newNode, referenceNode) {
  if (referenceNode && referenceNode.parentNode !== this) {
    if (referenceNode.parentNode) {
      try {
        return originalInsertBefore.call(referenceNode.parentNode, newNode, referenceNode);
      } catch (e) {
        console.warn("Bypassed insertBefore mismatch:", e);
      }
    }
    try {
      return this.appendChild(newNode);
    } catch (e) {
      return newNode;
    }
  }
  return originalInsertBefore.call(this, newNode, referenceNode);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
