export default function Regler() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Bakgrunn */}
      <img
        src="/wc-background.jpg"
        alt=""
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: '50% -20%',
          zIndex: -1,
        }}
      />

      {/* Innhold */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '12px 16px',
        }}
      >
        <img
          src="/regler.png"
          alt="Regler"
          style={{
            width: '100%',
            maxWidth: 860,
            height: 'auto',
            filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.7))',
          }}
        />
      </div>
    </div>
  )
}
