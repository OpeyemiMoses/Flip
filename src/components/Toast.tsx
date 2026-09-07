import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, AlertTriangle, Info, ExternalLink, X } from 'lucide-react';
import { useMarketStore, ToastNotification } from '../store/marketStore';
import { SOMNIA_CONFIG } from '../contracts/chain';

const ToastItem: React.FC<{ toast: ToastNotification; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 size={18} color="#00FF66" />;
      case 'error':
        return <XCircle size={18} color="#FF3B69" />;
      case 'warning':
        return <AlertTriangle size={18} color="#FBBF24" />;
      case 'info':
      default:
        return <Info size={18} color="#38BDF8" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'rgba(0, 255, 102, 0.35)';
      case 'error':
        return 'rgba(255, 59, 105, 0.35)';
      case 'warning':
        return 'rgba(251, 191, 36, 0.35)';
      case 'info':
      default:
        return 'rgba(56, 189, 248, 0.35)';
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#0F0E0D',
        border: `1px solid ${getBorderColor()}`,
        borderRadius: '12px',
        padding: '0.9rem 1.15rem',
        boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
        width: '360px',
        maxWidth: '90vw',
        animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          {getIcon()}
          <span
            className="font-bobz"
            style={{
              fontSize: '0.88rem',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '0.01em',
            }}
          >
            {toast.title}
          </span>
        </div>

        <button
          onClick={() => onDismiss(toast.id)}
          style={{
            background: 'none',
            border: 'none',
            color: '#9CA3AF',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.15s ease',
          }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Message */}
      {toast.message && (
        <div
          className="font-subtext"
          style={{
            fontSize: '0.80rem',
            color: '#D1D5DB',
            lineHeight: 1.45,
            paddingLeft: '1.65rem',
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Explorer Link if txHash present */}
      {toast.txHash && (
        <div style={{ paddingLeft: '1.65rem', marginTop: '0.2rem' }}>
          <a
            href={`${SOMNIA_CONFIG.explorerUrl}/tx/${toast.txHash}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: 'var(--color-green)',
              fontSize: '0.74rem',
              fontFamily: "'Space Mono', monospace",
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            <span>Shannon Explorer</span>
            <ExternalLink size={11} />
          </a>
        </div>
      )}

      {/* Auto-Dismiss Progress Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '2.5px',
          backgroundColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            height: '100%',
            backgroundColor: toast.type === 'success' ? '#00FF66' : toast.type === 'error' ? '#FF3B69' : '#38BDF8',
            animation: 'shrinkProgress 5s linear forwards',
          }}
        />
      </div>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useMarketStore();

  if (!toasts || toasts.length === 0) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        pointerEvents: 'auto',
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(40px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes shrinkProgress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
      ))}
    </div>,
    document.body
  );
};
