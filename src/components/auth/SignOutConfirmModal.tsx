import React from 'react';
import { createPortal } from 'react-dom';
import { LogOut, X, ShieldAlert, Check, Copy, User, Wallet } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useDisconnect } from 'wagmi';
import { useMarketStore } from '../../store/marketStore';

interface SignOutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignedOut?: () => void;
  onOpenProfile?: () => void;
}

export const SignOutConfirmModal: React.FC<SignOutConfirmModalProps> = ({
  isOpen,
  onClose,
  onSignedOut,
  onOpenProfile,
}) => {
  const { user, logout } = usePrivy();
  const { disconnect } = useDisconnect();
  const { userAddress, setUserAddress, addToast } = useMarketStore();
  const [copied, setCopied] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      // 1. Disconnect Wagmi Web3 provider
      try {
        disconnect();
      } catch (err) {
        console.warn('[SignOut] Wagmi disconnect err:', err);
      }

      // 2. Disconnect Privy session
      try {
        await logout();
      } catch (err) {
        console.warn('[SignOut] Privy logout err:', err);
      }

      // 3. Clear Zustand local store
      setUserAddress(null);

      addToast({
        type: 'info',
        title: 'Signed Out',
        message: 'You have been disconnected from FLIP.',
      });

      onClose();
      if (onSignedOut) {
        onSignedOut();
      }
    } catch (err: any) {
      console.error('[SignOut] Sign out error:', err);
      onClose();
    } finally {
      setIsSigningOut(false);
    }
  };

  const emailDisplay = user?.email?.address || 'Email Account';
  const walletDisplay = userAddress || 'No active wallet';

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          animation: 'scaleUp 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Danger Accent */}
        <div
          style={{
            padding: '1.5rem 1.75rem 1.25rem 1.75rem',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#FFF1F2',
                color: '#E11D48',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <LogOut size={18} />
            </div>
            <div>
              <h3
                className="font-bobz"
                style={{
                  fontSize: '1.08rem',
                  fontWeight: 800,
                  color: '#0F172A',
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                Sign Out &amp; Disconnect
              </h3>
              <p
                style={{
                  fontSize: '0.78rem',
                  color: '#64748B',
                  margin: 0,
                  marginTop: '0.15rem',
                }}
              >
                End your active session on FLIP
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: '0.4rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem 1.75rem' }}>
          <p
            style={{
              fontSize: '0.88rem',
              color: '#334155',
              lineHeight: 1.5,
              margin: '0 0 1.25rem 0',
            }}
          >
            Do you want to sign out of your account and disconnect your Web3 wallet?
          </p>

          {/* Active Session Info Card */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              marginBottom: '1.5rem',
            }}
          >
            {/* Account Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <User size={13} />
                <span>Account</span>
              </span>
              <span className="font-bobz" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                {emailDisplay}
              </span>
            </div>

            {/* Wallet Row */}
            {userAddress && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Wallet size={13} />
                  <span>Wallet</span>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span className="font-mono" style={{ fontSize: '0.80rem', fontWeight: 600, color: '#0F172A' }}>
                    {`${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`}
                  </span>
                  <button
                    onClick={() => handleCopy(userAddress)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '0.2rem',
                      cursor: 'pointer',
                      color: '#64748B',
                    }}
                    title="Copy Address"
                  >
                    {copied ? <Check size={12} color="var(--color-green)" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              style={{
                backgroundColor: '#E11D48',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '26px',
                padding: '0.85rem 1.5rem',
                fontSize: '0.92rem',
                fontFamily: 'var(--font-bobz)',
                fontWeight: 800,
                cursor: isSigningOut ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(225, 29, 72, 0.25)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#BE123C')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#E11D48')}
            >
              <LogOut size={16} />
              <span>{isSigningOut ? 'Disconnecting...' : 'Sign Out & Disconnect'}</span>
            </button>

            <button
              onClick={onClose}
              style={{
                backgroundColor: '#F1F5F9',
                color: '#334155',
                border: 'none',
                borderRadius: '26px',
                padding: '0.80rem 1.5rem',
                fontSize: '0.88rem',
                fontFamily: 'var(--font-bobz)',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E2E8F0')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
            >
              Keep Signed In
            </button>

            {onOpenProfile && (
              <button
                onClick={() => {
                  onClose();
                  onOpenProfile();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0284C7',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '0.4rem',
                  marginTop: '0.25rem',
                  textAlign: 'center',
                }}
              >
                Manage Profile &amp; Bound Wallets →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
