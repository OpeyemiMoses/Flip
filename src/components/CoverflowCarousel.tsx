import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Copy, ExternalLink, TrendingUp, Cpu, Activity, BarChart2 } from 'lucide-react';
import { SOMNIA_CONFIG } from '../contracts/chain';

interface StrategyCard {
  id: string;
  tag: string;
  title: string;
  desc: string;
  color: string;
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
}

const STRATEGY_CARDS: StrategyCard[] = [
  {
    id: '01',
    tag: '01 / AMM LIQUIDITY',
    title: 'MARKET MAKING',
    desc: 'Provide two-sided liquidity around fair odds to capture AMM fee spreads.',
    color: '#00FF66',
    icon: TrendingUp,
  },
  {
    id: '02',
    tag: '02 / INTERVAL LADDERING',
    title: 'GRID TRADING',
    desc: 'Execute laddered interval orders as probability swings between UP and DOWN.',
    color: '#38BDF8',
    icon: Activity,
  },
  {
    id: '03',
    tag: '03 / HIGH FREQUENCY',
    title: 'MOMENTUM ALPHA',
    desc: 'Follow real-time price trends with sub-second Somnia execution speed.',
    color: '#F59E0B',
    icon: Cpu,
  },
  {
    id: '04',
    tag: '04 / STATISTICAL ARB',
    title: 'MEAN REVERSION',
    desc: 'Capitalize on overextended probability pricing prior to block expiry.',
    color: '#A855F7',
    icon: BarChart2,
  },
];

interface CoverflowCarouselProps {
  onExplore?: () => void;
}

export const CoverflowCarousel: React.FC<CoverflowCarouselProps> = ({ onExplore }) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [copiedContract, setCopiedContract] = useState<boolean>(false);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : STRATEGY_CARDS.length - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev < STRATEGY_CARDS.length - 1 ? prev + 1 : 0));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const copyAddress = () => {
    navigator.clipboard.writeText(SOMNIA_CONFIG.collateralRouter);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  return (
    <section
      id="dynamics"
      style={{
        backgroundColor: '#070707',
        color: 'var(--color-white)',
        padding: '5rem 0 4.5rem 0',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: '1240px', width: '94%', margin: '0 auto' }}>
        {/* Section Header */}
        <div className="reveal-pop" style={{ textAlign: 'left', marginBottom: '2rem' }}>
          <div style={{ marginBottom: '0.35rem' }}>
            <span className="font-number" style={{ fontSize: '0.98rem', color: '#9CA3AF', letterSpacing: '0.06em' }}>
              0.5 —
            </span>
          </div>

          <h2
            className="font-bobz"
            style={{
              fontSize: '1.85rem',
              fontWeight: 400,
              color: '#FFFFFF',
              letterSpacing: '-0.01em',
              margin: '0 0 0.5rem 0',
              textTransform: 'uppercase',
              lineHeight: 1.15,
            }}
          >
            AUTONOMOUS EXECUTION & AMM
          </h2>

          <p
            className="font-subtext"
            style={{
              fontSize: '0.90rem',
              color: '#D1D5DB',
              maxWidth: '680px',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Somnia and DreamDEX provide high-throughput infrastructure and bot SDKs for developers and traders to automate prediction positions.
          </p>
        </div>

        {/* 3D Perspective Coverflow Carousel for User's 4 Cards */}
        <div
          style={{
            position: 'relative',
            height: '270px',
            width: '100%',
            maxWidth: '1000px',
            margin: '0 auto',
            perspective: '1300px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {STRATEGY_CARDS.map((card, idx) => {
            const offset = idx - activeIndex;
            const isCenter = offset === 0;

            // 3D calculation
            let translateX = 0;
            let translateZ = 0;
            let rotateY = 0;
            let scale = 1;
            let zIndex = 1;
            let opacity = 1;
            let filter = 'brightness(1)';

            if (isCenter) {
              translateX = 0;
              translateZ = 90;
              rotateY = 0;
              scale = 1.06;
              zIndex = 10;
              opacity = 1;
              filter = 'brightness(1)';
            } else if (offset === -1 || (activeIndex === 0 && idx === STRATEGY_CARDS.length - 1 && offset !== -1)) {
              translateX = -230;
              translateZ = 0;
              rotateY = 20;
              scale = 0.92;
              zIndex = 6;
              opacity = 0.82;
              filter = 'brightness(0.75)';
            } else if (offset === 1 || (activeIndex === STRATEGY_CARDS.length - 1 && idx === 0 && offset !== 1)) {
              translateX = 230;
              translateZ = 0;
              rotateY = -20;
              scale = 0.92;
              zIndex = 6;
              opacity = 0.82;
              filter = 'brightness(0.75)';
            } else if (offset === -2) {
              translateX = -410;
              translateZ = -70;
              rotateY = 28;
              scale = 0.82;
              zIndex = 3;
              opacity = 0.5;
              filter = 'brightness(0.5)';
            } else if (offset === 2) {
              translateX = 410;
              translateZ = -70;
              rotateY = -28;
              scale = 0.82;
              zIndex = 3;
              opacity = 0.5;
              filter = 'brightness(0.5)';
            } else {
              translateX = offset > 0 ? 520 : -520;
              translateZ = -150;
              rotateY = offset > 0 ? -35 : 35;
              scale = 0.72;
              zIndex = 1;
              opacity = 0;
              filter = 'brightness(0.3)';
            }

            const IconComponent = card.icon;

            return (
              <div
                key={card.id}
                onClick={() => setActiveIndex(idx)}
                style={{
                  position: 'absolute',
                  width: '270px',
                  height: '210px',
                  backgroundColor: '#0D0D0D',
                  border: isCenter
                    ? `1.5px dashed ${card.color}`
                    : '1px dashed rgba(255, 255, 255, 0.18)',
                  borderRadius: '10px',
                  padding: '1.4rem 1.3rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  textAlign: 'left',
                  cursor: isCenter ? 'default' : 'pointer',
                  transformStyle: 'preserve-3d',
                  transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  zIndex,
                  opacity,
                  filter,
                  boxShadow: isCenter
                    ? `0 20px 45px rgba(0, 0, 0, 0.85), 0 0 25px ${card.color}15`
                    : '0 10px 25px rgba(0, 0, 0, 0.5)',
                  transition: 'all 0.5s cubic-bezier(0.25, 1, 0.35, 1)',
                  userSelect: 'none',
                }}
              >
                {/* Top: Tag + Status Dot */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    className="font-terminal"
                    style={{
                      fontSize: '0.78rem',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: '#9CA3AF',
                      fontWeight: 700,
                    }}
                  >
                    {card.tag}
                  </span>
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: card.color,
                      boxShadow: isCenter ? `0 0 8px ${card.color}` : 'none',
                      display: 'inline-block',
                    }}
                  />
                </div>

                {/* Middle: Colored Card Title */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.45rem' }}>
                    <IconComponent size={16} color={card.color} />
                    <h3
                      className="font-bobz"
                      style={{
                        fontSize: '1.18rem',
                        fontWeight: 800,
                        letterSpacing: '0.02em',
                        color: card.color,
                        margin: 0,
                        textTransform: 'uppercase',
                      }}
                    >
                      {card.title}
                    </h3>
                  </div>

                  {/* Card Description */}
                  <p
                    className="font-subtext"
                    style={{
                      fontSize: '0.92rem',
                      color: '#E5E7EB',
                      lineHeight: 1.55,
                      margin: 0,
                    }}
                  >
                    {card.desc}
                  </p>
                </div>

                {/* Bottom: Active indicator label */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '0.5rem' }}>
                  <span className="font-terminal" style={{ fontSize: '0.74rem', color: isCenter ? card.color : '#71717A' }}>
                    {isCenter ? '● ACTIVE STRATEGY' : 'SELECT TO VIEW'}
                  </span>
                  <span className="font-terminal" style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>
                    DREAMDEX BOT SDK
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Carousel Bottom Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2rem',
            marginTop: '1.5rem',
            marginBottom: '2.5rem',
          }}
        >
          {/* Left Arrow Button */}
          <button
            onClick={handlePrev}
            aria-label="Previous strategy card"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.14)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
              e.currentTarget.style.transform = 'scale(1.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <ChevronLeft size={16} />
          </button>

          {/* Center Indicator Bar / Dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {STRATEGY_CARDS.map((c, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  style={{
                    width: isActive ? '22px' : '6px',
                    height: '6px',
                    borderRadius: '4px',
                    backgroundColor: isActive ? c.color : 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'all 0.35s cubic-bezier(0.25, 1, 0.35, 1)',
                  }}
                />
              );
            })}
          </div>

          {/* Right Arrow Button */}
          <button
            onClick={handleNext}
            aria-label="Next strategy card"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.14)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
              e.currentTarget.style.transform = 'scale(1.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Bottom Shannon Router Pill Bar */}
        <div
          className="reveal-pop"
          style={{
            backgroundColor: '#0A0A0A',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            borderRadius: '12px',
            padding: '0.85rem 1.35rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#00FF66',
                boxShadow: '0 0 8px rgba(0, 255, 102, 0.7)',
                flexShrink: 0,
                display: 'inline-block',
              }}
            />
            <span className="font-terminal" style={{ fontSize: '0.76rem', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
              Shannon Testnet Router: <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{SOMNIA_CONFIG.collateralRouter}</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            <button
              onClick={copyAddress}
              style={{
                backgroundColor: '#161616',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.20)',
                borderRadius: '9999px',
                padding: '0.42rem 0.95rem',
                fontFamily: 'var(--font-bobz)',
                fontSize: '0.64rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#262626';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#161616';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.20)';
              }}
            >
              <Copy size={11} />
              <span>{copiedContract ? 'COPIED!' : 'COPY'}</span>
            </button>

            <a
              href="https://shannon-explorer.somnia.network"
              target="_blank"
              rel="noreferrer"
              style={{
                backgroundColor: '#FFFFFF',
                color: '#000000',
                borderRadius: '9999px',
                padding: '0.45rem 1.15rem',
                fontFamily: 'var(--font-bobz)',
                fontSize: '0.68rem',
                fontWeight: 900,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(255, 255, 255, 0.15)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E5E7EB';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span>SOMNIASCAN</span>
              <ExternalLink size={11} strokeWidth={2.5} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
