// screens.jsx — Cyberbullies Fantasy · pusha versjon (synket fra GitHub master)
//
// Speilbilde av frontend/src/pages/Home.jsx + Navbar + Pitch + SidePlayerCard
// fra adampaalsrudbratsvedal-commits/cyberbullies-fantasy@master.

// ─────────────────────────────────────────────────────────────
// Sample data — for å rendre mockupen
// ─────────────────────────────────────────────────────────────
const PLAYERS = [
  { userName: 'Adam',    overallPoints: 1247, roundPoints: 98  },
  { userName: 'Torjus',  overallPoints: 1198, roundPoints: 71  },
  { userName: 'Markus',  overallPoints: 1156, roundPoints: 124 },
  { userName: 'Sondre',  overallPoints: 1089, roundPoints: 55  },
  { userName: 'Henrik',  overallPoints: 1043, roundPoints: 62  },
  { userName: 'Vegard',  overallPoints: 1011, roundPoints: 68  },
  { userName: 'Kasper',  overallPoints:  982, roundPoints: 44  },
  { userName: 'Even',    overallPoints:  947, roundPoints: 39  },
];
const ROUND_NO = 4;
const TOTAL_ROUNDS = 64;
const LAST_SYNCED = '12.06 · 14:32';
const CURRENT_USER = 'AdamPBS';

// ─────────────────────────────────────────────────────────────
// Tokens — fra frontend/src/lib/theme.js
// ─────────────────────────────────────────────────────────────
const TH = {
  bg:        '#0a1610',
  elev:      '#152a1f',
  card:      '#1d3528',
  border:    'rgba(180, 220, 195, 0.10)',
  text:      '#ecfdf5',
  muted:     '#9cc4b1',
  dim:       '#5e8773',
  accent:    '#5eea93',
  accentDeep:'#16a34a',
  gold:      '#fbbf24',
  goldSoft:  'rgba(251, 191, 36, 0.14)',
  info:      '#7dd3fc',
  infoSoft:  'rgba(125, 211, 252, 0.16)',
  warn:      '#fb7185',
  warnSoft:  'rgba(251, 113, 133, 0.12)',
  font:      '"Space Grotesk", system-ui, sans-serif',
  mono:      '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
};

// ─────────────────────────────────────────────────────────────
// Pitch — diagonale mowed-stripes + stadionlysvignett + svake banelinjer
// (den «kulere» varianten fra første iterasjon)
// ─────────────────────────────────────────────────────────────
function Pitch({ stripeWidth = 100, angle = 78 }) {
  return (
    <div aria-hidden style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      pointerEvents: 'none', zIndex: 0,
    }}>
      {/* Mowed diagonale striper */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `repeating-linear-gradient(${angle}deg, ${TH.bg} 0px, ${TH.bg} ${stripeWidth}px, #0d1d15 ${stripeWidth}px, #0d1d15 ${stripeWidth * 2}px)`,
      }} />
      {/* Stadionlys-wash fra toppen + svak bunn-vignett */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(120% 80% at 50% -10%, rgba(94,234,147,0.06) 0%, transparent 55%), linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.35) 100%)',
      }} />
      {/* Svake banelinjer — senterlinje, midtsirkel og senterpunkt */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.05 }}
        preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 900">
        <line x1="720" y1="0" x2="720" y2="900" stroke={TH.accent} strokeWidth="1.2" />
        <circle cx="720" cy="450" r="120" stroke={TH.accent} strokeWidth="1.2" fill="none" />
        <circle cx="720" cy="450" r="2.5" fill={TH.accent} />
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Avatar — kun brukt i Stats-podiet (matcher Avatar.jsx)
// ─────────────────────────────────────────────────────────────
function hashHue(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return h % 360;
}
function Avatar({ name = '', size = 40, ring }) {
  const initials = name.slice(0, 2).toUpperCase();
  const hue = hashHue(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      display: 'grid', placeItems: 'center', flexShrink: 0,
      color: '#f1f5f9', fontWeight: 600,
      fontSize: size * 0.36, letterSpacing: '-0.02em',
      background: `linear-gradient(140deg, oklch(0.38 0.10 ${hue}) 0%, oklch(0.22 0.06 ${hue + 30}) 100%)`,
      border: ring ? `2px solid ${ring}` : '1px solid rgba(255,255,255,0.08)',
    }}>{initials}</div>
  );
}

// ─────────────────────────────────────────────────────────────
// Navbar — svart bakgrunn, VM_LOGO + "Fotball VM 2026"
// (matcher frontend/src/components/Navbar.jsx)
// ─────────────────────────────────────────────────────────────
function Navbar({ activePath = '/', compact = false }) {
  const links = [
    { to: '/',          label: 'Tabell' },
    { to: '/stats',     label: 'Stats' },
    { to: '/historikk', label: 'Ligahistorie' },
  ];
  return (
    <nav style={{ background: '#000', borderBottom: '1px solid #222', position: 'relative', zIndex: 2 }}>
      <div style={{
        maxWidth: 1152, margin: '0 auto', padding: '0 16px',
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="frontend/public/VM_LOGO.png" alt="FIFA World Cup 2026"
            style={{ height: 36, width: 'auto' }} />
          {!compact && (
            <span style={{
              color: '#fff', fontWeight: 700, fontSize: 13,
              letterSpacing: '0.16em', textTransform: 'uppercase',
            }}>Fotball VM 2026</span>
          )}
        </div>

        {!compact && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {links.map((l) => {
              const active = l.to === activePath;
              return (
                <span key={l.to} style={{
                  padding: '6px 16px', fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.16em',
                  color: active ? '#fff' : '#aaa',
                  borderBottom: active ? '2px solid #fff' : '2px solid transparent',
                }}>{l.label}</span>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!compact ? (
            <>
              <span style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                {CURRENT_USER}
              </span>
              <span style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Logg ut
              </span>
            </>
          ) : (
            <div style={{ width: 24, height: 24, display: 'grid', placeItems: 'center' }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────
// SidePlayerCard — bilde i stedet for initial-avatar
// (matcher frontend/src/components/SidePlayerCard.jsx)
// ─────────────────────────────────────────────────────────────
function SidePlayerCard({ kind, player, roundNo, leaderOverall }) {
  if (!player) return null;
  const cfg = {
    leader: {
      label: 'LEDER', color: TH.gold, image: 'frontend/public/trophy.png',
      bigValue: player.overallPoints, bigSub: 'POENG · TOTALT', bigColor: TH.accent,
      sideLabel: `RUNDE ${roundNo}`, sideValue: `+${player.roundPoints}`, sideColor: TH.text,
      wash: 'linear-gradient(180deg, rgba(251,191,36,0.07) 0%, transparent 55%)',
    },
    round: {
      label: `RUNDEMESTER · R${roundNo}`, color: TH.info, image: 'frontend/public/rundevinner.png',
      bigValue: `+${player.roundPoints}`, bigSub: `POENG · RUNDE ${roundNo}`, bigColor: TH.info,
      sideLabel: 'TOTALT', sideValue: player.overallPoints, sideColor: TH.text,
      wash: 'linear-gradient(180deg, rgba(125,211,252,0.06) 0%, transparent 55%)',
    },
    last: {
      label: 'SISTEPLASS', color: TH.warn, image: 'frontend/public/sisteplass.jpg',
      bigValue: player.overallPoints, bigSub: 'POENG · TOTALT', bigColor: TH.text,
      sideLabel: 'FRA LEDER', sideValue: `−${leaderOverall - player.overallPoints}`, sideColor: TH.warn,
      wash: 'linear-gradient(180deg, rgba(251,113,133,0.06) 0%, transparent 55%)',
    },
  }[kind];

  return (
    <div style={{
      position: 'relative', overflow: 'hidden', flex: 1, minHeight: 0,
      background: TH.elev, border: `1px solid ${TH.border}`,
      borderRadius: 16, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ height: 3, background: cfg.color }} />
      <div style={{
        flex: 1, padding: '16px 18px',
        display: 'flex', flexDirection: 'column', gap: 14,
        background: cfg.wash,
      }}>
        <span style={{
          fontFamily: TH.mono, fontSize: 9.5, fontWeight: 600,
          color: cfg.color, letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>{cfg.label}</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
            overflow: 'hidden', background: TH.card,
            border: `2px solid ${cfg.color}66`,
          }}>
            <img src={cfg.image} alt={cfg.label}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 18, fontWeight: 700, color: TH.text,
              letterSpacing: '-0.02em', lineHeight: 1.1,
            }}>{player.userName}</div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div>
          <div style={{
            fontSize: 42, fontWeight: 700, lineHeight: 0.95,
            color: cfg.bigColor, letterSpacing: '-0.04em',
            fontVariantNumeric: 'tabular-nums',
          }}>{cfg.bigValue}</div>
          <div style={{
            fontFamily: TH.mono, fontSize: 9.5, color: TH.dim,
            letterSpacing: '0.14em', marginTop: 6, textTransform: 'uppercase',
          }}>{cfg.bigSub}</div>
        </div>

        <div style={{ height: 1, background: TH.border, marginTop: 2 }} />
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{
            fontFamily: TH.mono, fontSize: 10, color: TH.dim,
            letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>{cfg.sideLabel}</span>
          <span style={{
            fontSize: 17, fontWeight: 600, color: cfg.sideColor,
            letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums',
          }}>{cfg.sideValue}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Ligatabell-rad
// ─────────────────────────────────────────────────────────────
function TableRow({ p, i, totalRows, roundNo, isRoundWinner, compact }) {
  const isLeader = i === 0;
  const isLast = i === totalRows - 1;
  const railColor = isLeader ? TH.gold : isLast ? TH.warn : 'transparent';
  const cols = compact ? '40px 1fr 80px 90px' : '40px 1fr 80px 90px';
  const px = compact ? 12 : 24;

  return (
    <div style={{
      position: 'relative', display: 'grid', alignItems: 'center', gap: 12,
      gridTemplateColumns: cols, padding: `16px ${px}px`,
      borderTop: i > 0 ? `1px solid ${TH.border}` : 'none',
      background: isLeader
        ? 'linear-gradient(90deg, rgba(251,191,36,0.07) 0%, transparent 65%)'
        : 'transparent',
      fontVariantNumeric: 'tabular-nums',
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: railColor,
      }} />
      <span style={{
        fontFamily: TH.mono, fontSize: 14, fontWeight: 600,
        color: isLeader ? TH.gold : isLast ? TH.warn : TH.muted,
      }}>{String(i + 1).padStart(2, '0')}</span>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, minWidth: 0,
        fontSize: 15, fontWeight: 600, color: TH.text, letterSpacing: '-0.01em',
      }}>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.userName}</span>
        {isRoundWinner && (
          <span style={{
            fontFamily: TH.mono, fontSize: 9, fontWeight: 600,
            color: TH.info, background: TH.infoSoft,
            padding: '2px 6px', borderRadius: 4,
            letterSpacing: '0.12em', textTransform: 'uppercase', flexShrink: 0,
          }}>RUNDEMESTER R{roundNo}</span>
        )}
      </div>
      <span style={{
        textAlign: 'right',
        fontFamily: TH.mono, fontSize: 15, fontWeight: 600,
        color: isRoundWinner ? TH.info : TH.muted,
      }}>+{p.roundPoints}</span>
      <span style={{
        textAlign: 'right', fontSize: 22, fontWeight: 700,
        letterSpacing: '-0.025em',
        color: isLeader ? TH.accent : TH.text,
      }}>{p.overallPoints}</span>
    </div>
  );
}

function LigatabellCard({ compact, sorted, roundWinner, roundNo }) {
  return (
    <div style={{
      background: TH.elev, border: `1px solid ${TH.border}`,
      borderRadius: 16, overflow: 'hidden',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '40px 1fr 80px 90px',
        padding: `12px ${compact ? 12 : 24}px`,
        borderBottom: `1px solid ${TH.border}`,
        background: TH.bg,
        fontFamily: TH.mono, fontSize: 10, color: TH.dim,
        letterSpacing: '0.14em', textTransform: 'uppercase',
      }}>
        <span>#</span>
        <span>SPILLER</span>
        <span style={{ textAlign: 'right', color: TH.muted }}>RUNDE {roundNo}</span>
        <span style={{ textAlign: 'right' }}>TOTALT</span>
      </div>
      {sorted.map((p, i) => (
        <TableRow
          key={p.userName}
          p={p}
          i={i}
          totalRows={sorted.length}
          roundNo={roundNo}
          isRoundWinner={roundWinner && p.userName === roundWinner.userName}
          compact={compact}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page-header for Tabell
// ─────────────────────────────────────────────────────────────
function PageHeader({ roundNo, lastSynced, compact }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      marginBottom: 24,
    }}>
      <div>
        <h1 style={{
          margin: 0, fontWeight: 700, color: TH.text,
          fontSize: compact ? 28 : 36, letterSpacing: '-0.03em',
        }}>Tabell</h1>
        <p style={{ margin: '4px 0 0', fontSize: compact ? 12 : 14, color: TH.muted }}>
          VM 2026 Fantasy Liga · Runde {roundNo} av {TOTAL_ROUNDS}
        </p>
      </div>
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '6px 12px', borderRadius: 999,
            background: TH.card, border: `1px solid ${TH.border}`,
            fontFamily: TH.mono, fontSize: 10.5, color: TH.muted,
            letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>RUNDE {roundNo} / {TOTAL_ROUNDS}</div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: TH.mono, fontSize: 11, color: TH.dim,
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: TH.accent }} />
            SYNK {lastSynced}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DESKTOP — Tabell
// ─────────────────────────────────────────────────────────────
function ScreenDesktop() {
  const sorted = [...PLAYERS];
  const leader = sorted[0];
  const last = sorted[sorted.length - 1];
  const roundWinner = [...PLAYERS].sort((a, b) => b.roundPoints - a.roundPoints)[0];

  return (
    <div style={{
      width: '100%', height: '100%', background: TH.bg, color: TH.text,
      fontFamily: TH.font, position: 'relative', overflow: 'auto',
    }}>
      <Pitch />
      <Navbar activePath="/" />
      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1152, margin: '0 auto',
        padding: '32px 16px 40px',
      }}>
        <PageHeader roundNo={ROUND_NO} lastSynced={LAST_SYNCED} />
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 300px' }}>
          <div>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: TH.text, letterSpacing: '-0.01em' }}>
                Ligatabell
              </h2>
              <span style={{
                fontFamily: TH.mono, fontSize: 11, color: TH.dim,
                letterSpacing: '0.12em', textTransform: 'uppercase',
              }}>{sorted.length} SPILLERE</span>
            </div>
            <LigatabellCard sorted={sorted} roundWinner={roundWinner} roundNo={ROUND_NO} />
          </div>
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
            <SidePlayerCard kind="leader" player={leader} roundNo={ROUND_NO} leaderOverall={leader.overallPoints} />
            <SidePlayerCard kind="round"  player={roundWinner} roundNo={ROUND_NO} />
            <SidePlayerCard kind="last"   player={last} roundNo={ROUND_NO} leaderOverall={leader.overallPoints} />
          </aside>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MOBILE — Tabell (kortene stacker under)
// ─────────────────────────────────────────────────────────────
function ScreenMobile() {
  const sorted = [...PLAYERS];
  const leader = sorted[0];
  const last = sorted[sorted.length - 1];
  const roundWinner = [...PLAYERS].sort((a, b) => b.roundPoints - a.roundPoints)[0];

  return (
    <div style={{
      width: '100%', height: '100%', background: TH.bg, color: TH.text,
      fontFamily: TH.font, position: 'relative', overflow: 'auto',
      paddingTop: 54, // ios status bar
    }}>
      <Pitch stripeWidth={60} angle={70} />
      <Navbar activePath="/" compact />
      <div style={{
        position: 'relative', zIndex: 1,
        padding: '24px 16px 32px',
      }}>
        <PageHeader roundNo={ROUND_NO} lastSynced={LAST_SYNCED} compact />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: TH.text, letterSpacing: '-0.01em' }}>
                Ligatabell
              </h2>
              <span style={{
                fontFamily: TH.mono, fontSize: 10, color: TH.dim,
                letterSpacing: '0.12em', textTransform: 'uppercase',
              }}>{sorted.length} SPILLERE</span>
            </div>
            <LigatabellCard sorted={sorted} roundWinner={roundWinner} roundNo={ROUND_NO} compact />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <SidePlayerCard kind="leader" player={leader} roundNo={ROUND_NO} leaderOverall={leader.overallPoints} />
            <SidePlayerCard kind="round"  player={roundWinner} roundNo={ROUND_NO} />
            <SidePlayerCard kind="last"   player={last} roundNo={ROUND_NO} leaderOverall={leader.overallPoints} />
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  ScreenMobile, ScreenDesktop,
  // delt med stats.jsx
  TH, Avatar, Pitch, Navbar, hashHue,
  PLAYERS, ROUND_NO, TOTAL_ROUNDS, CURRENT_USER,
});
