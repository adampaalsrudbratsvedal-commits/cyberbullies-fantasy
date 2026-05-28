// VMBracket.jsx — VM 2026 Gruppetabeller + Knockout-bracket

import { useEffect, useState, useCallback } from 'react'
import { getGroups, getFixtures } from '../api'
import Pitch from '../components/Pitch'
import { TH } from '../lib/theme'

// ── Flagg-mapping ─────────────────────────────────────────────

const FLAGS = {
  'Mexico': 'mx', 'South Africa': 'za', 'Korea Republic': 'kr', 'South Korea': 'kr',
  'Czechia': 'cz', 'Canada': 'ca', 'Bosnia-Herzegovina': 'ba', 'Bosnia and Herzegovina': 'ba',
  'United States': 'us', 'USA': 'us', 'United States of America': 'us',
  'Paraguay': 'py', 'Qatar': 'qa', 'Switzerland': 'ch', 'Brazil': 'br',
  'Morocco': 'ma', 'Haiti': 'ht', 'Scotland': 'gb-sct', 'Australia': 'au',
  'Turkey': 'tr', 'Türkiye': 'tr', 'Germany': 'de', 'Curaçao': 'cw',
  'Netherlands': 'nl', 'Japan': 'jp', "Côte d'Ivoire": 'ci', 'Ivory Coast': 'ci',
  'Ecuador': 'ec', 'Sweden': 'se', 'Tunisia': 'tn', 'Belgium': 'be',
  'Egypt': 'eg', 'Iran': 'ir', 'IR Iran': 'ir', 'New Zealand': 'nz',
  'Spain': 'es', 'Cape Verde Islands': 'cv', 'Cabo Verde': 'cv', 'Cape Verde': 'cv',
  'Saudi Arabia': 'sa', 'Uruguay': 'uy', 'France': 'fr', 'Senegal': 'sn',
  'Iraq': 'iq', 'Norway': 'no', 'Argentina': 'ar', 'Algeria': 'dz',
  'Austria': 'at', 'Jordan': 'jo', 'Portugal': 'pt',
  'Congo DR': 'cd', 'DR Congo': 'cd', 'Democratic Republic of Congo': 'cd',
  'England': 'gb-eng', 'Croatia': 'hr', 'Ghana': 'gh', 'Panama': 'pa',
  'Uzbekistan': 'uz', 'Colombia': 'co', 'Venezuela': 've', 'Chile': 'cl',
  'Peru': 'pe', 'Bolivia': 'bo', 'Costa Rica': 'cr', 'Honduras': 'hn',
  'Jamaica': 'jm', 'El Salvador': 'sv', 'Guatemala': 'gt',
  'China PR': 'cn', 'China': 'cn', 'Indonesia': 'id', 'Thailand': 'th',
  'Philippines': 'ph', 'Vietnam': 'vn', 'Malaysia': 'my',
  'Nigeria': 'ng', 'Cameroon': 'cm', 'Mali': 'ml', 'Ivory Coast': 'ci',
  'Tanzania': 'tz', 'Zimbabwe': 'zw', 'Kenya': 'ke',
  'Libya': 'ly', 'Comoros': 'km', 'Benin': 'bj',
  'Venezuela': 've', 'Honduras': 'hn',
  'Cuba': 'cu', 'Trinidad and Tobago': 'tt',
  'New Caledonia': 'nc', 'Fiji': 'fj',
  'Palestine': 'ps', 'Lebanon': 'lb', 'Kuwait': 'kw', 'Bahrain': 'bh',
  'Oman': 'om', 'UAE': 'ae', 'United Arab Emirates': 'ae',
}

function getFlag(name, shortName) {
  return FLAGS[name] || FLAGS[shortName]
}

function isLive(status) {
  if (!status) return false
  const s = status.toUpperCase()
  return s.includes('LIVE') || s.includes('IN_PLAY') || s.includes('INPROGRESS') || s.includes('HALFTIME')
}

function isFinished(status) {
  if (!status) return false
  const s = status.toUpperCase()
  return s.includes('FINISH') || s.includes('COMPLETED') || s.includes('FULL') || s === 'FT'
}

// ── GROUP TABLE ───────────────────────────────────────────────

function GroupTable({ group, table }) {
  const letter = group.replace('GROUP_', '')
  return (
    <div
      style={{
        background: TH.elev,
        border: `1px solid ${TH.border}`,
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: TH.card,
          padding: '5px 10px',
          borderBottom: `1px solid ${TH.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            color: TH.accent,
            letterSpacing: '0.12em',
            fontFamily: 'monospace',
          }}
        >
          GRUPPE {letter}
        </span>
        <span style={{ fontSize: 8, color: TH.dim, fontFamily: 'monospace', letterSpacing: '0.06em' }}>
          K · V · U · T · P
        </span>
      </div>

      {/* Rows */}
      {(table || []).map((row, i) => {
        const qualified = i < 2
        const flagCode = getFlag(row.team?.name, row.team?.shortName)
        return (
          <div
            key={row.team?.id ?? i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 8px',
              borderTop: i > 0 ? `1px solid ${TH.border}` : 'none',
              background: qualified ? 'rgba(94,234,147,0.03)' : 'transparent',
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: qualified ? TH.accent : TH.dim,
                fontFamily: 'monospace',
                width: 10,
                flexShrink: 0,
              }}
            >
              {row.position}
            </span>
            {flagCode ? (
              <img
                src={`https://flagcdn.com/w20/${flagCode}.png`}
                alt={row.team?.name}
                style={{ width: 15, height: 10, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }}
              />
            ) : (
              <div style={{ width: 15, height: 10, borderRadius: 1, background: TH.bg, flexShrink: 0, opacity: 0.3 }} />
            )}
            <span
              style={{
                fontSize: 10.5,
                color: TH.text,
                fontWeight: 500,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}
            >
              {row.team?.shortName || row.team?.name || '—'}
            </span>
            <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
              {[row.playedGames, row.won, row.draw, row.lost].map((v, j) => (
                <span
                  key={j}
                  style={{
                    fontSize: 9.5,
                    color: TH.muted,
                    fontFamily: 'monospace',
                    width: 12,
                    textAlign: 'center',
                  }}
                >
                  {v}
                </span>
              ))}
              <span
                style={{
                  fontSize: 11,
                  color: TH.text,
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  width: 16,
                  textAlign: 'center',
                  marginLeft: 2,
                }}
              >
                {row.points}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function GroupsPanel({ groups }) {
  if (!groups || groups.length === 0) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: TH.elev, border: `1px solid ${TH.border}` }}
      >
        <p style={{ color: TH.dim, fontSize: 13 }}>Gruppedata ikke tilgjengelig ennå</p>
      </div>
    )
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(215px, 1fr))', gap: 10 }}>
      {groups.map((g) => (
        <GroupTable key={g.group} group={g.group} table={g.table} />
      ))}
    </div>
  )
}

// ── BRACKET ───────────────────────────────────────────────────

const BRACKET_H = 640

const ROUND_META = {
  R32:  { label: 'R32',    color: TH.info },
  R16:  { label: 'R16',    color: TH.info },
  QF:   { label: 'KVF',   color: TH.gold },
  SF:   { label: 'SEF',   color: TH.gold },
  F:    { label: 'FINALE', color: '#f43f5e' },
}

function BracketSlot({ match, isFinal }) {
  const home = match?.homeSquadName
  const away = match?.awaySquadName
  const homeCode = home ? getFlag(home, home) : null
  const awayCode = away ? getFlag(away, away) : null
  const hasScore = match?.homeScore != null && match?.awayScore != null
  const live = match && isLive(match.status)
  const noTeams = !home && !away

  const W = isFinal ? 62 : 50
  const flagW = isFinal ? 20 : 16
  const flagH = isFinal ? 14 : 11
  const fontSize = isFinal ? 13 : 10

  return (
    <div
      style={{
        width: W,
        border: `1px solid ${live ? TH.accent : noTeams ? TH.border + '55' : TH.border}`,
        borderRadius: isFinal ? 7 : 4,
        background: live ? TH.elev : TH.card,
        overflow: 'hidden',
        opacity: noTeams ? 0.3 : 1,
        flexShrink: 0,
      }}
    >
      {live && <div style={{ height: 2, background: TH.accent }} />}
      {/* Home row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          padding: isFinal ? '4px 5px' : '3px 4px',
          borderBottom: `1px solid ${TH.border}`,
        }}
      >
        {homeCode ? (
          <img src={`https://flagcdn.com/w20/${homeCode}.png`} alt={home}
            style={{ width: flagW, height: flagH, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }} />
        ) : (
          <div style={{ width: flagW, height: flagH, borderRadius: 1, background: TH.bg, flexShrink: 0 }} />
        )}
        {hasScore && (
          <span style={{ fontSize, fontWeight: 700, color: live ? TH.accent : TH.text, marginLeft: 'auto', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {match.homeScore}
          </span>
        )}
      </div>
      {/* Away row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          padding: isFinal ? '4px 5px' : '3px 4px',
        }}
      >
        {awayCode ? (
          <img src={`https://flagcdn.com/w20/${awayCode}.png`} alt={away}
            style={{ width: flagW, height: flagH, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }} />
        ) : (
          <div style={{ width: flagW, height: flagH, borderRadius: 1, background: TH.bg, flexShrink: 0 }} />
        )}
        {hasScore && (
          <span style={{ fontSize, fontWeight: 700, color: live ? TH.accent : TH.text, marginLeft: 'auto', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {match.awayScore}
          </span>
        )}
      </div>
    </div>
  )
}

// Connector column between two round columns
// Draws the vertical bracket lines connecting pairs of slots
function BracketConnector({ fromCount, containerH, side }) {
  // fromCount = number of slots on the wider side (e.g. R32 has 8)
  // side = 'left' (converging left→right) | 'right' (converging right→left)
  const pairCount = fromCount / 2
  const pairH = containerH / pairCount
  const slotH = containerH / fromCount

  return (
    <div style={{ width: 10, height: containerH, position: 'relative', flexShrink: 0 }}>
      {Array.from({ length: pairCount }).map((_, i) => {
        const topCenter = (i * 2 + 0.5) * slotH      // center of top slot in pair
        const botCenter = (i * 2 + 1.5) * slotH      // center of bottom slot in pair
        const midY = (topCenter + botCenter) / 2       // vertical midpoint

        if (side === 'left') {
          // Left side: two horizontal lines from left, joined by vertical, exit right
          return (
            <div key={i} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%' }}>
              {/* Top horizontal arm */}
              <div style={{ position: 'absolute', left: 0, right: 5, top: topCenter, height: 1, background: TH.border }} />
              {/* Bottom horizontal arm */}
              <div style={{ position: 'absolute', left: 0, right: 5, top: botCenter, height: 1, background: TH.border }} />
              {/* Vertical connector */}
              <div style={{ position: 'absolute', right: 5, top: topCenter, height: botCenter - topCenter + 1, width: 1, background: TH.border }} />
              {/* Exit right */}
              <div style={{ position: 'absolute', right: 0, width: 5, top: midY, height: 1, background: TH.border }} />
            </div>
          )
        } else {
          // Right side: mirror — exit from left
          return (
            <div key={i} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%' }}>
              {/* Top horizontal arm */}
              <div style={{ position: 'absolute', left: 5, right: 0, top: topCenter, height: 1, background: TH.border }} />
              {/* Bottom horizontal arm */}
              <div style={{ position: 'absolute', left: 5, right: 0, top: botCenter, height: 1, background: TH.border }} />
              {/* Vertical connector */}
              <div style={{ position: 'absolute', left: 5, top: topCenter, height: botCenter - topCenter + 1, width: 1, background: TH.border }} />
              {/* Exit left */}
              <div style={{ position: 'absolute', left: 0, width: 5, top: midY, height: 1, background: TH.border }} />
            </div>
          )
        }
      })}
    </div>
  )
}

// Single connecting line between SF and FINAL
function SFtoFinalConnector({ side }) {
  if (side === 'left') {
    return (
      <div style={{ width: 10, height: BRACKET_H, position: 'relative', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: TH.border }} />
      </div>
    )
  }
  return (
    <div style={{ width: 10, height: BRACKET_H, position: 'relative', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: TH.border }} />
    </div>
  )
}

function RoundCol({ slots, isFinal, label, labelColor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span
        style={{
          fontSize: 7.5,
          fontFamily: 'monospace',
          letterSpacing: '0.1em',
          color: labelColor || TH.dim,
          marginBottom: 6,
          whiteSpace: 'nowrap',
          fontWeight: 700,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
          height: BRACKET_H,
          alignItems: 'center',
        }}
      >
        {slots.map((m, i) => (
          <BracketSlot key={i} match={m} isFinal={isFinal} />
        ))}
      </div>
    </div>
  )
}

function buildBracket(fixtures) {
  const pad = (arr, len) => {
    const out = [...arr]
    while (out.length < len) out.push(null)
    return out.slice(0, len)
  }
  const r32 = fixtures.filter((f) => f.stage === 'R32')
  const r16 = fixtures.filter((f) => f.stage === 'R16')
  const qf  = fixtures.filter((f) => f.stage === 'QF')
  const sf  = fixtures.filter((f) => f.stage === 'SF')
  const fin = fixtures.filter((f) => f.stage === 'F')

  return {
    r32L:  pad(r32.slice(0, 8), 8),
    r16L:  pad(r16.slice(0, 4), 4),
    qfL:   pad(qf.slice(0, 2), 2),
    sfL:   pad(sf.slice(0, 1), 1),
    final: pad(fin.slice(0, 1), 1),
    sfR:   pad(sf.slice(1, 2), 1),
    qfR:   pad(qf.slice(2, 4), 2),
    r16R:  pad(r16.slice(4, 8), 4),
    r32R:  pad(r32.slice(8, 16), 8),
  }
}

function BracketSection({ fixtures }) {
  const b = buildBracket(fixtures)

  return (
    <div style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: 8 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 0,
          minWidth: 'max-content',
          padding: '4px 8px',
        }}
      >
        {/* LEFT HALF */}
        <RoundCol slots={b.r32L} label="R32" labelColor={TH.info} />
        <BracketConnector fromCount={8} containerH={BRACKET_H} side="left" />
        <RoundCol slots={b.r16L} label="R16" labelColor={TH.info} />
        <BracketConnector fromCount={4} containerH={BRACKET_H} side="left" />
        <RoundCol slots={b.qfL} label="KVF" labelColor={TH.gold} />
        <BracketConnector fromCount={2} containerH={BRACKET_H} side="left" />
        <RoundCol slots={b.sfL} label="SEF" labelColor={TH.gold} />
        <SFtoFinalConnector side="left" />

        {/* FINAL */}
        <RoundCol slots={b.final} isFinal label="FINALE" labelColor="#f43f5e" />

        {/* RIGHT HALF */}
        <SFtoFinalConnector side="right" />
        <RoundCol slots={b.sfR} label="SEF" labelColor={TH.gold} />
        <BracketConnector fromCount={2} containerH={BRACKET_H} side="right" />
        <RoundCol slots={b.qfR} label="KVF" labelColor={TH.gold} />
        <BracketConnector fromCount={4} containerH={BRACKET_H} side="right" />
        <RoundCol slots={b.r16R} label="R16" labelColor={TH.info} />
        <BracketConnector fromCount={8} containerH={BRACKET_H} side="right" />
        <RoundCol slots={b.r32R} label="R32" labelColor={TH.info} />
      </div>
    </div>
  )
}

function BracketPanel({ fixtures }) {
  const knockoutFixtures = fixtures.filter((f) =>
    ['R32', 'R16', 'QF', 'SF', 'F'].includes(f.stage)
  )

  if (knockoutFixtures.length === 0) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: TH.elev, border: `1px solid ${TH.border}` }}
      >
        <p style={{ color: TH.dim, fontSize: 13 }}>Sluttspillkamper fylles inn når gruppespillet er ferdig</p>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: TH.elev, border: `1px solid ${TH.border}` }}
    >
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${TH.border}` }}>
        <h2 className="font-semibold" style={{ fontSize: 16, color: TH.text, letterSpacing: '-0.01em' }}>
          Knockout-bracket
        </h2>
        <p className="font-mono uppercase" style={{ fontSize: 9, color: TH.dim, letterSpacing: '0.12em', marginTop: 2 }}>
          R32 · R16 · KVF · SEF · FINALE
        </p>
      </div>
      <div style={{ padding: '12px 0' }}>
        <BracketSection fixtures={knockoutFixtures} />
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────

export default function VMBracket() {
  const [groups, setGroups] = useState([])
  const [fixtures, setFixtures] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('grupper')

  const load = useCallback(async () => {
    try {
      const [gr, fx] = await Promise.all([
        getGroups().catch(() => ({ data: { standings: [] } })),
        getFixtures().catch(() => ({ data: { fixtures: [] } })),
      ])
      setGroups(gr.data?.standings ?? [])
      setFixtures(fx.data?.fixtures ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const tabs = [
    { key: 'grupper', label: 'Grupper' },
    { key: 'bracket', label: 'Bracket' },
  ]

  return (
    <>
      <Pitch />

      <div
        className="max-w-7xl mx-auto px-4 py-8"
        style={{ color: TH.text, fontFamily: '"Space Grotesk", system-ui, sans-serif' }}
      >
        {/* Header */}
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="font-bold" style={{ fontSize: 36, letterSpacing: '-0.03em', color: TH.text }}>
              VM 2026
            </h1>
            <p className="mt-1" style={{ fontSize: 14, color: TH.muted }}>
              Gruppetabeller · Knockout-bracket
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16" style={{ color: TH.dim }}>Henter data…</div>
        ) : (
          <>
            {/* Mobile tabs */}
            <div
              className="flex gap-1.5 mb-5 lg:hidden"
              style={{
                background: TH.card,
                border: `1px solid ${TH.border}`,
                borderRadius: 8,
                padding: 4,
                display: 'inline-flex',
              }}
            >
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    padding: '6px 18px',
                    borderRadius: 5,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    fontFamily: 'monospace',
                    background: tab === t.key ? TH.accent : 'transparent',
                    color: tab === t.key ? TH.bg : TH.muted,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Desktop: side by side */}
            <div className="hidden lg:grid gap-8" style={{ gridTemplateColumns: 'minmax(0,420px) 1fr' }}>
              <div>
                <h2
                  className="font-semibold mb-4"
                  style={{ fontSize: 18, color: TH.text, letterSpacing: '-0.01em' }}
                >
                  Gruppetabeller
                </h2>
                <GroupsPanel groups={groups} />
              </div>
              <div>
                <BracketPanel fixtures={fixtures} />
              </div>
            </div>

            {/* Mobile: tab content */}
            <div className="lg:hidden">
              {tab === 'grupper' ? (
                <>
                  <h2
                    className="font-semibold mb-4"
                    style={{ fontSize: 18, color: TH.text, letterSpacing: '-0.01em' }}
                  >
                    Gruppetabeller
                  </h2>
                  <GroupsPanel groups={groups} />
                </>
              ) : (
                <BracketPanel fixtures={fixtures} />
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
