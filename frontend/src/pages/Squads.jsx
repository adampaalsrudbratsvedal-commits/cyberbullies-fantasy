import { useState, useEffect } from 'react'
import { getFantasySquads, syncFantasyPlayers, syncFantasySquads } from '../api'
import { useAuth } from '../AuthContext'

// ─── country code mapping ─────────────────────────────────────────────────────
const FLAGS = {
  'Argentina': 'ar', 'Australia': 'au', 'Austria': 'at', 'Belgium': 'be',
  'Bolivia': 'bo', 'Brazil': 'br', 'Cameroon': 'cm', 'Canada': 'ca',
  'Chile': 'cl', 'China': 'cn', "Côte d'Ivoire": 'ci', 'Ivory Coast': 'ci',
  'Colombia': 'co', 'Costa Rica': 'cr', 'Croatia': 'hr', 'Cuba': 'cu',
  'Czech Republic': 'cz', 'Denmark': 'dk', 'Ecuador': 'ec', 'Egypt': 'eg',
  'England': 'gb-eng', 'France': 'fr', 'Germany': 'de', 'Ghana': 'gh',
  'Greece': 'gr', 'Honduras': 'hn', 'Hungary': 'hu', 'Iceland': 'is',
  'Indonesia': 'id', 'Iran': 'ir', 'Iraq': 'iq', 'Israel': 'il',
  'Italy': 'it', 'Jamaica': 'jm', 'Japan': 'jp', 'Kenya': 'ke',
  'Mali': 'ml', 'Mexico': 'mx', 'Morocco': 'ma', 'Netherlands': 'nl',
  'New Zealand': 'nz', 'Nigeria': 'ng', 'Norway': 'no', 'Panama': 'pa',
  'Paraguay': 'py', 'Peru': 'pe', 'Poland': 'pl', 'Portugal': 'pt',
  'Qatar': 'qa', 'Romania': 'ro', 'Saudi Arabia': 'sa', 'Scotland': 'gb-sct',
  'Senegal': 'sn', 'Serbia': 'rs', 'Slovakia': 'sk', 'Slovenia': 'si',
  'South Africa': 'za', 'South Korea': 'kr', 'Korea Republic': 'kr',
  'Spain': 'es', 'Sweden': 'se', 'Switzerland': 'ch', 'Thailand': 'th',
  'Tunisia': 'tn', 'Turkey': 'tr', 'Ukraine': 'ua', 'United States': 'us',
  'USA': 'us', 'Uruguay': 'uy', 'Venezuela': 've', 'Wales': 'gb-wls',
  'Zambia': 'zm', 'Algeria': 'dz', 'Bahrain': 'bh', 'China PR': 'cn',
  'Congo DR': 'cd', 'Cuba': 'cu', 'Guatemala': 'gt', 'Haiti': 'ht',
  'Kuwait': 'kw', 'Lebanon': 'lb', 'Libya': 'ly', 'Oman': 'om',
  'Sudan': 'sd', 'Tanzania': 'tz', 'Trinidad and Tobago': 'tt',
}

function getFlag(teamName) {
  if (!teamName) return null
  const code = FLAGS[teamName]
  if (!code) return null
  return `https://flagcdn.com/w20/${code}.png`
}

// ─── Position helpers ─────────────────────────────────────────────────────────
const POS_LABEL = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' }
const POS_COLOR = {
  1: { bg: '#fbbf24', text: '#000' },
  2: { bg: '#3b82f6', text: '#fff' },
  3: { bg: '#10b981', text: '#fff' },
  4: { bg: '#ef4444', text: '#fff' },
}

// ─── Player card ──────────────────────────────────────────────────────────────
function PlayerCard({ pick }) {
  const posCol = POS_COLOR[pick.positionId] || { bg: '#555', text: '#fff' }
  const flag = getFlag(pick.nationalTeamName)

  return (
    <div
      style={{
        background: '#111',
        border: pick.isCaptain
          ? '2px solid #fbbf24'
          : pick.isViceCaptain
          ? '2px solid #94a3b8'
          : '1px solid #222',
        borderRadius: 8,
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        opacity: pick.isStarting === false ? 0.6 : 1,
        position: 'relative',
        minWidth: 0,
      }}
    >
      {/* Position badge */}
      <span
        style={{
          background: posCol.bg,
          color: posCol.text,
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 700,
          padding: '2px 5px',
          letterSpacing: '0.05em',
          flexShrink: 0,
        }}
      >
        {POS_LABEL[pick.positionId] || '?'}
      </span>

      {/* Flag */}
      {flag && (
        <img
          src={flag}
          alt={pick.nationalTeamName}
          style={{ width: 20, height: 'auto', flexShrink: 0 }}
          onError={(e) => { e.target.style.display = 'none' }}
        />
      )}

      {/* Name */}
      <span
        style={{
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {pick.shortName || pick.name}
      </span>

      {/* Points */}
      {pick.totalPoints != null && (
        <span style={{ color: '#aaa', fontSize: 11, flexShrink: 0 }}>
          {pick.totalPoints} p
        </span>
      )}

      {/* Captain badge */}
      {(pick.isCaptain || pick.isViceCaptain) && (
        <span
          style={{
            position: 'absolute',
            top: -8,
            right: 8,
            background: pick.isCaptain ? '#fbbf24' : '#94a3b8',
            color: '#000',
            fontSize: 9,
            fontWeight: 800,
            borderRadius: 3,
            padding: '1px 4px',
          }}
        >
          {pick.isCaptain ? 'C' : 'VC'}
        </span>
      )}
    </div>
  )
}

// ─── Squad section (XI + bench) ───────────────────────────────────────────────
function SquadView({ picks }) {
  const starters = picks.filter((p) => p.isStarting !== false).sort(
    (a, b) => (a.positionId || 9) - (b.positionId || 9) || (a.positionSlot || 0) - (b.positionSlot || 0)
  )
  const bench = picks.filter((p) => p.isStarting === false)

  // Group starters by position
  const grouped = starters.reduce((acc, p) => {
    const key = p.positionId || 0
    acc[key] = acc[key] || []
    acc[key].push(p)
    return acc
  }, {})

  const posOrder = [1, 2, 3, 4]
  const posNames = { 1: 'Keeper', 2: 'Forsvar', 3: 'Midtbane', 4: 'Angrep' }

  return (
    <div>
      {/* Starters */}
      {posOrder.map((posId) => {
        const group = grouped[posId]
        if (!group || group.length === 0) return null
        return (
          <div key={posId} style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: '#666',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              {posNames[posId]}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {group.map((pick, i) => (
                <PlayerCard key={`${posId}-${i}`} pick={pick} />
              ))}
            </div>
          </div>
        )
      })}

      {/* Bench */}
      {bench.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: '#444',
              textTransform: 'uppercase',
              marginBottom: 6,
              borderTop: '1px solid #222',
              paddingTop: 10,
            }}
          >
            Benk
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {bench
              .sort((a, b) => (a.positionSlot || 0) - (b.positionSlot || 0))
              .map((pick, i) => (
                <PlayerCard key={`bench-${i}`} pick={pick} />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Squads() {
  const { user } = useAuth()
  const [squads, setSquads] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeUser, setActiveUser] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState(null)

  useEffect(() => {
    getFantasySquads()
      .then((r) => {
        setSquads(r.data.squads || {})
        const users = Object.keys(r.data.squads || {})
        if (users.length > 0) setActiveUser(users[0])
      })
      .catch(() => setError('Kunne ikke hente lag'))
      .finally(() => setLoading(false))
  }, [])

  const handleSync = async (type) => {
    setSyncing(true)
    setSyncMsg(null)
    try {
      if (type === 'players') {
        const r = await syncFantasyPlayers()
        setSyncMsg(`Synkroniserte ${r.data.synced} spillere`)
      } else {
        const r = await syncFantasySquads()
        setSyncMsg(
          `Synkroniserte ${r.data.total_picks} picks for ${r.data.users_processed} brukere` +
            (r.data.errors?.length ? ` · ${r.data.errors.length} feil` : '')
        )
        // Refresh squads
        const sq = await getFantasySquads()
        setSquads(sq.data.squads || {})
        const users = Object.keys(sq.data.squads || {})
        if (users.length > 0 && !activeUser) setActiveUser(users[0])
      }
    } catch (e) {
      setSyncMsg(`Feil: ${e.response?.data?.detail || e.message}`)
    } finally {
      setSyncing(false)
    }
  }

  const users = squads ? Object.keys(squads).sort() : []
  const activePicks = activeUser && squads ? squads[activeUser] || [] : []

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: '#fff',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          Fantasy Lag
        </h1>
        <p style={{ color: '#666', fontSize: 13 }}>
          Alle deltagerenes fantasy-lag for VM 2026
        </p>
      </div>

      {/* Admin sync controls */}
      {user?.is_admin && (
        <div
          style={{
            background: '#0f0f0f',
            border: '1px solid #333',
            borderRadius: 8,
            padding: '14px 16px',
            marginBottom: 24,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#888', fontSize: 12, fontWeight: 600 }}>ADMIN</span>
          <button
            onClick={() => handleSync('players')}
            disabled={syncing}
            style={{
              background: '#222',
              border: '1px solid #444',
              color: '#fff',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: syncing ? 'not-allowed' : 'pointer',
              opacity: syncing ? 0.6 : 1,
            }}
          >
            {syncing ? 'Synkroniserer...' : 'Sync spillere'}
          </button>
          <button
            onClick={() => handleSync('squads')}
            disabled={syncing}
            style={{
              background: '#222',
              border: '1px solid #444',
              color: '#fff',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: syncing ? 'not-allowed' : 'pointer',
              opacity: syncing ? 0.6 : 1,
            }}
          >
            {syncing ? 'Synkroniserer...' : 'Sync lag'}
          </button>
          {syncMsg && (
            <span style={{ color: '#5eea93', fontSize: 12, marginLeft: 4 }}>{syncMsg}</span>
          )}
        </div>
      )}

      {/* Loading / error */}
      {loading && (
        <div style={{ color: '#666', fontSize: 14, textAlign: 'center', paddingTop: 40 }}>
          Henter lag...
        </div>
      )}
      {error && (
        <div style={{ color: '#f87171', fontSize: 14, textAlign: 'center', paddingTop: 40 }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && users.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            color: '#555',
            paddingTop: 60,
            paddingBottom: 60,
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#888', marginBottom: 6 }}>
            Ingen lag lagret ennå
          </div>
          <div style={{ fontSize: 13, color: '#555' }}>
            {user?.is_admin
              ? 'Trykk "Sync spillere" og deretter "Sync lag" for å hente lagene'
              : 'Lagene vil vises her når de er synkronisert av admin'}
          </div>
        </div>
      )}

      {/* User tabs + squad */}
      {!loading && users.length > 0 && (
        <div>
          {/* Tab bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginBottom: 24,
            }}
          >
            {users.map((u) => (
              <button
                key={u}
                onClick={() => setActiveUser(u)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  border: 'none',
                  background: activeUser === u ? '#fff' : '#1a1a1a',
                  color: activeUser === u ? '#000' : '#888',
                  transition: 'all 0.15s',
                }}
              >
                {u}
              </button>
            ))}
          </div>

          {/* Squad */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 16,
            }}
          >
            <div>
              {/* Squad header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                  paddingBottom: 10,
                  borderBottom: '1px solid #222',
                }}
              >
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#fff',
                  }}
                >
                  {activeUser}
                </span>
                <span style={{ color: '#555', fontSize: 12 }}>
                  {activePicks.filter((p) => p.isStarting !== false).length} spillere
                  {activePicks.filter((p) => p.isStarting === false).length > 0 &&
                    ` + ${activePicks.filter((p) => p.isStarting === false).length} benk`}
                </span>
              </div>

              {activePicks.length === 0 ? (
                <div style={{ color: '#555', fontSize: 13 }}>Ingen spillere funnet</div>
              ) : (
                <SquadView picks={activePicks} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
