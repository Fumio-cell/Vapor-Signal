import { useEffect, useState } from 'react';
import { supabase, getUserStatus, signInWithGoogle, signOut } from '../lib/commercial';
import { User, LogOut, Zap } from 'lucide-react';

const Header = () => {
  const [user, setUser] = useState<any>(null);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const status = await getUserStatus();
      setUser(status.user);
      setIsPro(status.isPro);
      
      // Dispatch event for other components to listen to
      window.dispatchEvent(new CustomEvent('auth:status', { detail: status }));
    };

    checkStatus();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: any) => {
      const status = await getUserStatus();
      setUser(status.user);
      setIsPro(status.isPro);
      window.dispatchEvent(new CustomEvent('auth:status', { detail: status }));
      
      if (event === 'SIGNED_IN') {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="app-header" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      height: '64px',
      borderBottom: '1px solid rgba(255,255,255,0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ 
          width: '32px', 
          height: '32px', 
          borderRadius: '8px', 
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold'
        }}>V</div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Vapor Signal</h1>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginTop: '-4px' }}>Poetic Signal Toolkit</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {!isPro && (
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('app:buyPro'))}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Zap size={14} fill="white" />
            Get PRO
          </button>
        )}

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>{user.email}</span>
            <button 
              onClick={() => signOut()}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => signInWithGoogle()}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 16px',
              color: 'white',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <User size={16} />
            Login
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
