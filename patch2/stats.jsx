// stats.jsx — Cyberbullies Stats · pusha versjon
// Speilbilde av frontend/src/pages/Stats.jsx fra master.

// ─────────────────────────────────────────────────────────────
// Sample simuleringsdata
// ─────────────────────────────────────────────────────────────
const SIM = {
  Adam:    { win: 0.420, last: 0.005, exp: 1620 },
  Torjus:  { win: 0.210, last: 0.012, exp: 1495 },
  Markus:  { win: 0.180, last: 0.018, exp: 1470 },
  Sondre:  { win: 0.090, last: 0.040, exp: 1380 },
  Henrik:  { win: 0.048, last: 0.060, exp: 1320 },
  Vegard:  { win: 0.035, last: 0.085, exp: 1290 },
  Kasper:  { win: 0.012, last: 0.250, exp: 1130 },
  Even:    { win: 0.005, last: 0.530, exp: 1060 },
};
const WIN_ENTRIES = Object.entries(SIM)
  .map(([name, d]) => ({ name, value: d.win, exp: d.exp }))
  .sort((a, b) => b.value - a.value);
const LAST_ENTRIES = Object.entries(SIM)
  .map(([name, d]) => ({ name, value: d.last, exp: d.exp }))
  .sort((a, b) => b.value - a.value);

// fictive prob-historikk over runde 1..4 for top 4
const ROUNDS = [1, 2, 3, 4];
const WIN_HIST = {
  Adam:   [0.30, 0.34, 0.39, 0.42],
  Torjus: [0.26, 0.23, 0.22, 0.21],
  Markus: [0.18, 0.20, 0.19, 0.18],
  Sondre: [0.11, 0.10, 0.10, 0.09],
};
const LAST_HIST = {
  Even:   [0.40, 0.45, 0.49, 0.53],
  Kasper: [0.20, 0.22, 0.24, 0.25],
  Vegard: [0.12, 0.10, 0.09, 0.085],
  Henrik: [0.08, 0.07, 0.07, 0.06],
};

// «Størst tiss»-ranking — hentet fra Helsenorge
const TISS_ENTRIES = [
  { name: 'Apb03',         cm: 21.3 },
  { name: 'Odin67',        cm: 18.2 },
  { name: 'Kalkunblaster', cm: 15.0 },
  { name: 'LeonC',         cm: 12.3 },
];

// ─────────────────────────────────────────────────────────────
// Mini line chart — replikere recharts-utseendet i statisk SVG
// ─────────────────────────────────────────────────────────────
function ProbLineChart({ rounds, series, colors, width = 540, height = 220 }) {
  const padL = 36, padR = 12, padT = 10, padB = 24;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const allVals = Object.values(series).flat();
  const maxPctVal = Math.max(...allVals) * 100 + 5;
  const yMax = Math.ceil(maxPctVal / 10) * 10;
  const xStep = innerW / Math.max(1, rounds.length - 1);

  const xAt = (i) => padL + i * xStep;
  const yAt = (v) => padT + innerH - ((v * 100) / yMax) * innerH;

  // grid (4 horisontale linjer)
  const gridY = [0, 1, 2, 3, 4].map((i) => padT + (i / 4) * innerH);

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {/* grid + y-ticks */}
      {gridY.map((y, i) => (
        <g key={i}>
          <line x1={padL} y1={y} x2={width - padR} y2={y}
            stroke={TH.border} strokeDasharray="2 3" />
          <text x={padL - 6} y={y + 3} textAnchor="end"
            fontFamily={TH.mono} fontSize={11} fill={TH.dim}>
            {Math.round(yMax - (i / 4) * yMax)}%
          </text>
        </g>
      ))}
      {/* x-axis */}
      <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB}
        stroke={TH.border} />
      {rounds.map((r, i) => (
        <text key={r} x={xAt(i)} y={height - padB + 14} textAnchor="middle"
          fontFamily={TH.mono} fontSize={11} fill={TH.dim}>R{r}</text>
      ))}
      {/* lines */}
      {Object.entries(series).map(([name, vals], idx) => {
        const path = vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)},${yAt(v)}`).join(' ');
        return (
          <g key={name}>
            <path d={path} stroke={colors[idx]} strokeWidth="2" fill="none"
              strokeLinecap="round" strokeLinejoin="round" />
            {vals.map((v, i) => (
              <circle key={i} cx={xAt(i)} cy={yAt(v)} r="3" fill={colors[idx]} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// «Størst tiss» — bonus-rangering (tall hentet fra Helsenorge)
// ─────────────────────────────────────────────────────────────
function TissBox({ compact }) {
  const max = Math.max(...TISS_ENTRIES.map((e) => e.cm));
  // medalje-farger: gull, sølv, bronse, deretter dempet
  const medalColors = [TH.gold, '#cbd5e1', '#d97706', TH.muted];
  return (
    <section style={{
      maxWidth: compact ? '100%' : 520,
      background: TH.elev, border: `1px solid ${TH.border}`,
      borderRadius: 16, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ height: 3, background: TH.gold }} />
      <div style={{ padding: '16px 20px 8px' }}>
        <div style={{
          fontFamily: TH.mono, fontSize: 10, fontWeight: 600,
          color: TH.gold, letterSpacing: '0.16em',
          textTransform: 'uppercase', marginBottom: 6,
        }}>BONUS-RANKING · N = 4</div>
        <h2 style={{
          margin: 0, fontWeight: 700, fontSize: 22,
          color: TH.text, letterSpacing: '-0.025em',
        }}>Størst tiss</h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: TH.muted }}>
          Tall hentet fra Helsenorge
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 20px 20px' }}>
        {TISS_ENTRIES.map((e, i) => {
          const pct = (e.cm / max) * 100;
          const color = medalColors[i] || TH.muted;
          return (
            <div key={e.name} style={{
              position: 'relative',
              display: 'grid', alignItems: 'center', gap: 12,
              gridTemplateColumns: '24px 1fr 90px',
              padding: '10px 4px 10px 14px',
              borderBottom: i < TISS_ENTRIES.length - 1 ? `1px solid ${TH.border}` : 'none',
            }}>
              <div style={{
                position: 'absolute', left: 0, top: 8, bottom: 8,
                width: 3, background: color, borderRadius: 2,
              }} />
              <span style={{
                fontFamily: TH.mono, fontSize: 12, fontWeight: 600,
                color, fontVariantNumeric: 'tabular-nums',
              }}>{String(i + 1).padStart(2, '0')}</span>

              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: TH.text,
                  letterSpacing: '-0.01em', marginBottom: 5,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{e.name}</div>
                <div style={{
                  height: 4, borderRadius: 999, overflow: 'hidden',
                  background: TH.bg,
                }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color }} />
                </div>
              </div>

              <span style={{
                textAlign: 'right',
                fontFamily: TH.mono, fontSize: 15, fontWeight: 600,
                color: i === 0 ? color : TH.text,
                fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
              }}>{e.cm.toFixed(1).replace('.', ',')} cm</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// PodiumRow + ProbRow (matcher Stats.jsx)
// ─────────────────────────────────────────────────────────────
function PodiumRow({ name, prob, exp, color, rank }) {
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      display: 'grid', gridTemplateColumns: '26px 40px 1fr auto',
      alignItems: 'center', gap: 12,
      background: TH.elev, border: `1px solid ${TH.border}`,
      borderRadius: 12, padding: '12px 14px',
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: color }} />
      <span style={{
        fontFamily: TH.mono, fontSize: 12, fontWeight: 600,
        color, fontVariantNumeric: 'tabular-nums',
      }}>{String(rank).padStart(2, '0')}</span>
      <Avatar name={name} size={36} ring={rank === 1 ? color : undefined} />
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: TH.text,
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{name}</div>
        <div style={{
          fontFamily: TH.mono, fontSize: 10, color: TH.dim,
          letterSpacing: '0.04em', marginTop: 2, textTransform: 'uppercase',
        }}>FORVENTET <span style={{ color: TH.muted }}>{Math.round(exp)}</span> P</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontSize: 22, fontWeight: 700, lineHeight: 1,
          color: rank === 1 ? color : TH.text,
          letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums',
        }}>{(prob * 100).toFixed(1)}%</div>
      </div>
    </div>
  );
}

function ProbRow({ name, prob, exp, color, max }) {
  const pct = max > 0 ? prob / max : 0;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '28px 1fr 52px',
      alignItems: 'center', gap: 12, padding: '8px 4px',
    }}>
      <Avatar name={name} size={24} />
      <div>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginBottom: 5,
        }}>
          <span style={{ fontSize: 12.5, color: TH.text, fontWeight: 500 }}>{name}</span>
          <span style={{
            fontFamily: TH.mono, fontSize: 10, color: TH.dim,
            letterSpacing: '0.04em',
          }}>{Math.round(exp)} p</span>
        </div>
        <div style={{ height: 4, borderRadius: 999, overflow: 'hidden', background: TH.bg }}>
          <div style={{ height: '100%', width: `${pct * 100}%`, background: color }} />
        </div>
      </div>
      <span style={{
        textAlign: 'right',
        fontFamily: TH.mono, fontSize: 12, fontWeight: 600, color,
        fontVariantNumeric: 'tabular-nums',
      }}>{(prob * 100).toFixed(1)}%</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section (Sannsynlighet for seier / sisteplass)
// ─────────────────────────────────────────────────────────────
function StatsSection({ title, subtitle, color, entries, history, mode, compact, chartWidth }) {
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const max = entries[0]?.value ?? 0;
  const colors = mode === 'win'
    ? [TH.accent, TH.gold, TH.info, TH.muted]
    : [TH.warn,   '#fda4af', TH.gold, TH.muted];
  const top4Names = entries.slice(0, 4).map((e) => e.name);
  const series = {};
  top4Names.forEach((n) => { if (history[n]) series[n] = history[n]; });

  return (
    <section style={{
      background: TH.elev, border: `1px solid ${TH.border}`,
      borderRadius: 16, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ height: 3, background: color }} />
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '16px 20px 0',
      }}>
        <div>
          <div style={{
            fontFamily: TH.mono, fontSize: 10, fontWeight: 600,
            color, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6,
          }}>SIMULERING · 250 000 SIMULERINGER</div>
          <h2 style={{
            margin: 0, fontWeight: 700, fontSize: 22,
            color: TH.text, letterSpacing: '-0.025em',
          }}>{title}</h2>
          {subtitle && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: TH.muted }}>{subtitle}</p>
          )}
        </div>
        <span style={{
          fontFamily: TH.mono, fontSize: 10, color: TH.dim,
          letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>R1 → R{ROUNDS[ROUNDS.length - 1]}</span>
      </div>

      <div style={{
        display: 'grid', gap: 20, padding: 20,
        gridTemplateColumns: compact ? '1fr' : '320px 1fr',
      }}>
        {/* Podium + rest */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {top3.map((e, i) => (
            <PodiumRow key={e.name} name={e.name} prob={e.value} exp={e.exp}
              color={colors[i]} rank={i + 1} />
          ))}
          {rest.length > 0 && (
            <div style={{
              marginTop: 6, paddingTop: 8, padding: '8px 4px 0',
              borderTop: `1px solid ${TH.border}`,
            }}>
              <div style={{
                fontFamily: TH.mono, fontSize: 9.5, color: TH.dim,
                letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4,
              }}>ØVRIGE</div>
              {rest.map((e) => (
                <ProbRow key={e.name} name={e.name} prob={e.value} exp={e.exp}
                  color={TH.muted} max={max} />
              ))}
            </div>
          )}
        </div>

        {/* Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          <div style={{
            fontFamily: TH.mono, fontSize: 10.5, fontWeight: 600,
            color: TH.muted, letterSpacing: '0.16em', textTransform: 'uppercase',
          }}>UTVIKLING</div>
          <div style={{
            borderRadius: 12, padding: 10,
            background: TH.bg, border: `1px solid ${TH.border}`,
          }}>
            <ProbLineChart
              rounds={ROUNDS}
              series={series}
              colors={colors}
              width={chartWidth}
              height={220}
            />
          </div>
          {/* legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', padding: '0 4px' }}>
            {top4Names.map((n, i) => {
              const lastPct = (series[n]?.[series[n].length - 1] * 100).toFixed(1);
              return (
                <span key={n} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 11.5, color: TH.muted,
                }}>
                  <span style={{ width: 14, height: 2, background: colors[i], borderRadius: 1 }} />
                  <span>{n}</span>
                  <span style={{
                    fontFamily: TH.mono, fontSize: 10, color: colors[i],
                    letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums',
                  }}>{lastPct}%</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// DESKTOP — Stats
// ─────────────────────────────────────────────────────────────
function ScreenStatsDesktop() {
  return (
    <div style={{
      width: '100%', height: '100%', background: TH.bg, color: TH.text,
      fontFamily: TH.font, position: 'relative', overflow: 'auto',
    }}>
      <Pitch />
      <Navbar activePath="/stats" />
      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1152, margin: '0 auto', padding: '32px 16px 40px',
      }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontWeight: 700, fontSize: 36, letterSpacing: '-0.03em', color: TH.text }}>
            Stats
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: TH.muted }}>
            Monte Carlo-simulering av sluttstillingen · Runde {ROUNDS.length}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <StatsSection
            title="Sannsynlighet for seier"
            subtitle="Who knows ball"
            color={TH.accent}
            entries={WIN_ENTRIES}
            history={WIN_HIST}
            mode="win"
            chartWidth={540}
          />
          <StatsSection
            title="Sannsynlighet for sisteplass"
            subtitle="Hvem stryker med bunnplassen?"
            color={TH.warn}
            entries={LAST_ENTRIES}
            history={LAST_HIST}
            mode="last"
            chartWidth={540}
          />
          <TissBox />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MOBILE — Stats
// ─────────────────────────────────────────────────────────────
function ScreenStatsMobile() {
  return (
    <div style={{
      width: '100%', height: '100%', background: TH.bg, color: TH.text,
      fontFamily: TH.font, position: 'relative', overflow: 'auto',
      paddingTop: 54,
    }}>
      <Pitch />
      <Navbar activePath="/stats" compact />
      <div style={{
        position: 'relative', zIndex: 1,
        padding: '24px 16px 32px',
      }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontWeight: 700, fontSize: 28, letterSpacing: '-0.03em', color: TH.text }}>
            Stats
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: TH.muted }}>
            Monte Carlo · Runde {ROUNDS.length}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <StatsSection
            title="Sannsynlighet for seier"
            subtitle="Who knows ball"
            color={TH.accent}
            entries={WIN_ENTRIES}
            history={WIN_HIST}
            mode="win"
            compact
            chartWidth={400}
          />
          <StatsSection
            title="Sannsynlighet for sisteplass"
            subtitle="Hvem stryker med bunnplassen?"
            color={TH.warn}
            entries={LAST_ENTRIES}
            history={LAST_HIST}
            mode="last"
            compact
            chartWidth={400}
          />
          <TissBox compact />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenStatsMobile, ScreenStatsDesktop });
