export default function Regler() {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-12"
      style={{
        backgroundImage: 'url(/reglerBakgrunn.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <img
        src="/regler.png"
        alt="Regler"
        className="w-full drop-shadow-2xl"
        style={{
          maxWidth: 520,
          width: '100%',
          height: 'auto',
        }}
      />
    </div>
  )
}
