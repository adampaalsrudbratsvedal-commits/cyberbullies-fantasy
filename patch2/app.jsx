// app.jsx — Cyberbullies · pusha versjon · 4 artboards (Tabell + Stats × mobil + desktop)

function App() {
  return (
    <DesignCanvas>
      <DCSection
        id="tabell"
        title="Cyberbullies · Tabell"
        subtitle="Synket fra adampaalsrudbratsvedal-commits/cyberbullies-fantasy@master"
      >
        <DCArtboard id="mobile" label="Mobil" width={460} height={1500}>
          <IOSDevice width={460} height={1500} dark={true}>
            <ScreenMobile />
          </IOSDevice>
        </DCArtboard>

        <DCArtboard id="desktop" label="Desktop" width={1440} height={900}>
          <ChromeWindow
            width={1440}
            height={900}
            url="cyberbullies-fantasy.vercel.app/"
            tabs={[{ title: 'Cyberbullies · Tabell' }, { title: 'Stats' }]}
            activeIndex={0}
          >
            <ScreenDesktop />
          </ChromeWindow>
        </DCArtboard>
      </DCSection>

      <DCSection
        id="stats"
        title="Cyberbullies · Stats"
        subtitle="Monte Carlo · sannsynlighet for seier og sisteplass."
      >
        <DCArtboard id="stats-mobile" label="Mobil" width={460} height={2100}>
          <IOSDevice width={460} height={2100} dark={true}>
            <ScreenStatsMobile />
          </IOSDevice>
        </DCArtboard>

        <DCArtboard id="stats-desktop" label="Desktop" width={1440} height={1450}>
          <ChromeWindow
            width={1440}
            height={1450}
            url="cyberbullies-fantasy.vercel.app/stats"
            tabs={[{ title: 'Cyberbullies · Tabell' }, { title: 'Stats' }]}
            activeIndex={1}
          >
            <ScreenStatsDesktop />
          </ChromeWindow>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
