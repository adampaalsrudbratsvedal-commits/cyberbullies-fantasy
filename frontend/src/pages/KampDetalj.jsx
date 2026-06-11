import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getFixtures, getAllMatchPicks } from '../api'
import Pitch from '../components/Pitch'
import Avatar from '../components/Avatar'
import { TH } from '../lib/theme'

const FLAGS = {
  'Mexico': 'mx', 'South Africa': 'za', 'South Korea': 'kr', 'Korea Republic': 'kr',
  'Czechia': 'cz', 'Canada': 'ca', 'Bosnia-Herzegovina': 'ba', 'United States': 'us',
  'Paraguay': 'py', 'Qatar': 'qa', 'Switzerland': 'ch', 'Brazil': 'br',
  'Morocco': 'ma', 'Haiti': 'ht', 'Scotland': 'gb-sct', 'Australia': 'au',
  'Turkey': 'tr', 'Türkiye': 'tr', 'Germany': 'de', 'Curaçao': 'cw',
  'Netherlands': 'nl', 'Japan': 'jp', "Côte d'Ivoire": 'ci', 'Ivory Coast': 'ci',
  'Ecuador': 'ec', 'Sweden': 'se', 'Tunisia': 'tn', 'Belgium': 'be',
  'Egypt': 'eg', 'Iran': 'ir', 'IR Iran': 'ir', 'New Zealand': 'nz',
  'Spain': 'es', 'Cape Verde Islands': 'cv', 'Cabo Verde': 'cv',
  'Saudi Arabia': 'sa', 'Uruguay': 'uy', 'France': 'fr', 'Senegal': 'sn',
  'Iraq': 'iq', 'Norway': 'no', 'Argentina': 'ar', 'Algeria': 'dz',
  'Austria': 'at', 'Jordan': 'jo', 'Portugal': 'pt', 'Congo DR': 'cd',
  'England': 'gb-eng', 'Croatia': 'hr', 'Ghana': 'gh', 'Panama': 'pa',
  'Uzbekistan': 'uz', 'Colombia': 'co',
}

const TEAM_ALIASES = {
  'USA': 'United States', 'United States of America': 'United States',
  'Korea Republic': 'South Korea', 'Republic of Korea': 'South Korea',
  'IR Iran': 'Iran', 'Ivory Coast': "Côte d'Ivoire", "Cote d'Ivoire": "Côte d'Ivoire",
  'Türkiye': 'Turkey', 'Czechia': 'Czech Republic',
  'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
  'Cabo Verde': 'Cape Verde Islands', 'Cape Verde': 'Cape Verde Islands',
  'DR Congo': 'Congo DR', 'DRC': 'Congo DR',
}
function normTeam(name) { return TEAM_ALIASES[name] || name || '' }

const POS_LABEL = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' }
const POS_COL = { 1: '#fbbf24', 2: '#3b82f6', 3: '#10b981', 4: '#ef4444' }

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
function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('no-NO', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return dateStr }
}

function FlagLarge({ name }) {
  const code = FLAGS[name]
  if (!code) return <div style={{ width: 48, height: 32, borderRadius: 4, background: TH.card }} />
  return (
    <img
      src={`https://flagcdn.com/w80/${code}.png`}
      alt={name}
      style={{ width: 48, height: 32, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
    />
  )
}

function MatchHeader({ match }) {
  const live = isLive(match.status)
  const finished = isFinished(match.status)
  const hasScore = match.homeScore !== null && match.homeScore !== undefined
    && match.awayScore !== null && match.awayScore !== undefined

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: TH.elev, border: `1px solid ${live ? TH.accent + '55' : TH.border}` }}
    >
      {live && <div style={{ height: 3, background: TH.accent }} />}

      {/* Status bar */}
      <div
        className="flex items-center justify-center gap-3 px-5 pt-4 pb-2"
        style={{ fontSize: 11, color: TH.dim, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}
      >
        {live ? (
          <span className="flex items-center gap-1.5" style={{ color: TH.accent, fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: TH.accent, display: 'inline-block' }} />
            LIVE
          </span>
        ) : finished ? (
          <span style={{ color: TH.muted }}>FERDIG</span>
        ) : (
          <span>{formatDate(match.date)}</span>
        )}
        {match.venueName && <span style={{ color: TH.dim }}>· {match.venueName}</span>}
      </div>

      {/* Teams + score */}
      <div className="grid items-center px-6 py-5" style={{ gridTemplateColumns: '1fr auto 1fr', gap: 16 }}>
        {/* Hjemmelag */}
        <div className="flex flex-col items-center gap-2 text-center">
          <FlagLarge name={match.homeSquadName} />
          <span className="font-bold" style={{ fontSize: 20, color: TH.text, letterSpacing: '-0.02em' }}>
            {match.homeSquadName}
          </span>
        </div>

        {/* Score */}
        <div
          className="flex flex-col items-center justify-center rounded-xl px-5 py-3"
          style={{ background: TH.card, minWidth: 100 }}
        >
          {hasScore ? (
            <div className="flex items-center gap-2">
              <span className="font-bold tabular-nums" style={{ fontSize: 40, color: live ? TH.accent : TH.text, letterSpacing: '-0.04em', lineHeight: 1 }}>
                {match.homeScore}
              </span>
              <span style={{ fontSize: 20, color: TH.dim }}>–</span>
              <span className="font-bold tabular-nums" style={{ fontSize: 40, color: live ? TH.accent : TH.text, letterSpacing: '-0.04em', lineHeight: 1 }}>
                {match.awayScore}
              </span>
            </div>
          ) : (
            <span className="font-mono font-semibold" style={{ fontSize: 15, color: TH.dim, letterSpacing: '0.06em' }}>VS</span>
          )}
          {(live || finished) && (
            <span style={{ fontSize: 10, color: TH.dim, marginTop: 4 }}>{formatDate(match.date)}</span>
          )}
        </div>

        {/* Bortelag */}
        <div className="flex flex-col items-center gap-2 text-center">
          <FlagLarge name={match.awaySquadName} />
          <span className="font-bold" style={{ fontSize: 20, color: TH.text, letterSpacing: '-0.02em' }}>
            {match.awaySquadName}
          </span>
        </div>
      </div>
    </div>
  )
}

function PlayerCard({ player, side, teamName }) {
  const isHome = side === 'home'
  const accent = isHome ? '#3b82f6' : '#ef4444'
  const accentSoft = isHome ? '#3b82f618' : '#ef444418'

  return (
    <div
      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
      style={{ background: accentSoft, border: `1px solid ${accent}33` }}
    >
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {player.isCaptain && (
          <span style={{ fontSize: 9, background: '#fbbf24', color: '#000', borderRadius: 3, padding: '1px 4px', fontWeight: 800, flexShrink: 0 }}>C</span>
        )}
        {player.isViceCaptain && (
          <span style={{ fontSize: 9, background: '#94a3b8', color: '#000', borderRadius: 3, padding: '1px 4px', fontWeight: 800, flexShrink: 0 }}>VC</span>
        )}
        <span style={{ fontSize: 13, fontWeight: 600, color: TH.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {player.name}
        </span>
      </div>
      {player.positionId && (
        <span
          className="font-mono font-bold flex-shrink-0"
          style={{ fontSize: 10, color: POS_COL[player.positionId], background: POS_COL[player.positionId] + '22', borderRadius: 4, padding: '1px 5px' }}
        >
          {POS_LABEL[player.positionId] || '?'}
        </span>
      )}
    </div>
  )
}

function FantasySection({ match, byTeam }) {
  const homeNorm = normTeam(match.homeSquadName)
  const awayNorm = normTeam(match.awaySquadName)
  const homeMap = byTeam[homeNorm] || {}
  const awayMap = byTeam[awayNorm] || {}
  const allUsers = [...new Set([...Object.keys(homeMap), ...Object.keys(awayMap)])].sort()

  if (allUsers.length === 0) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{ background: TH.elev, border: `1px solid ${TH.border}` }}
      >
        <p style={{ fontSize: 13, color: TH.dim }}>Ingen fantasy-spillere fra disse lagene</p>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: TH.elev, border: `1px solid ${TH.border}` }}
    >
      <div style={{ height: 3, background: `linear-gradient(90deg, #3b82f6 50%, #ef4444 50%)` }} />
      <div className="px-5 pt-4 pb-5">
        <h2 className="font-bold mb-1" style={{ fontSize: 18, color: TH.text, letterSpacing: '-0.01em' }}>
          Fantasy-spillere i kampen
        </h2>
        <div className="flex items-center gap-4 mb-5" style={{ fontSize: 11, color: TH.dim }}>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#3b82f655' }} />
            {match.homeSquadName}
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#ef444455' }} />
            {match.awaySquadName}
          </span>
        </div>

        <div className="flex flex-col gap-5">
          {allUsers.map((user) => {
            const homePicks = (homeMap[user] || []).map(p => ({ ...p, side: 'home' }))
            const awayPicks = (awayMap[user] || []).map(p => ({ ...p, side: 'away' }))
            const allPicks = [...homePicks, ...awayPicks]
            return (
              <div key={user}>
                <div className="flex items-center gap-2 mb-2">
                  <Avatar name={user} size={28} />
                  <span className="font-bold" style={{ fontSize: 14, color: TH.text }}>{user}</span>
                  <span
                    className="font-mono"
                    style={{ fontSize: 10, color: TH.dim, background: TH.card, borderRadius: 99, padding: '1px 7px' }}
                  >
                    {allPicks.length} spiller{allPicks.length !== 1 ? 'e' : ''}
                  </span>
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {allPicks.map((p, i) => (
                    <PlayerCard key={i} player={p} side={p.side} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function KampDetalj() {
  const { matchId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()

  const [match, setMatch] = useState(state?.match || null)
  const [byTeam, setByTeam] = useState(state?.byTeam || {})
  const [loading, setLoading] = useState(!state?.match)

  useEffect(() => {
    if (!match) {
      Promise.all([getFixtures(), getAllMatchPicks()])
        .then(([fixturesRes, picksRes]) => {
          const fixtures = fixturesRes.data?.fixtures ?? []
          const found = fixtures.find(f => String(f.id) === String(matchId))
          setMatch(found || null)
          setByTeam(picksRes.data?.byTeam ?? {})
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    } else if (!state?.byTeam) {
      getAllMatchPicks()
        .then(r => setByTeam(r.data?.byTeam ?? {}))
        .catch(() => {})
    }
  }, [matchId])

  return (
    <>
      <Pitch />
      <div
        className="max-w-3xl mx-auto px-4 py-8"
        style={{ color: TH.text, fontFamily: '"Space Grotesk", system-ui, sans-serif' }}
      >
        <button
          onClick={() => navigate('/kamper')}
          className="flex items-center gap-2 mb-6 font-semibold"
          style={{ fontSize: 14, color: TH.muted, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          ← Kamper
        </button>

        {loading ? (
          <div className="text-center py-16" style={{ color: TH.dim }}>Henter kampdata…</div>
        ) : !match ? (
          <div className="text-center py-16" style={{ color: TH.dim }}>Kamp ikke funnet</div>
        ) : (
          <div className="flex flex-col gap-5">
            <MatchHeader match={match} />
            <FantasySection match={match} byTeam={byTeam} />
          </div>
        )}
      </div>
    </>
  )
}
