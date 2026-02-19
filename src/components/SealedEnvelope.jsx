export default function SealedEnvelope({
  bothSubmitted, onBreakSeal, keithSubmitted, danielleSubmitted, waitingFor,
}) {
  return (
    <div className="seal-container">
      <div
        className={`seal-visual ${bothSubmitted ? 'breakable' : 'sealed'}`}
        onClick={bothSubmitted ? onBreakSeal : undefined}
      >
        {bothSubmitted ? '\u{1F513}' : '\u{1F512}'}
      </div>

      {bothSubmitted ? (
        <>
          <p style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600 }}>
            Both reactions are sealed
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: '1rem' }}
            onClick={onBreakSeal}
          >
            Break the Seal
          </button>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', margin: '1rem 0' }}>
            <SealDot name="Keith" sealed={keithSubmitted} />
            <SealDot name="Danielle" sealed={danielleSubmitted} />
          </div>
          {waitingFor && (
            <p className="seal-waiting">
              Waiting for {waitingFor} to seal their reaction...
            </p>
          )}
          <p className="seal-status-text">
            Your reaction has been sealed. You cannot view it until both readers have submitted.
          </p>
        </>
      )}
    </div>
  );
}

function SealDot({ name, sealed }) {
  const color = name === 'Keith' ? 'var(--keith)' : 'var(--danielle)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
      <div style={{
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: sealed ? color : 'var(--bg-elevated)',
        border: `2px solid ${sealed ? color : 'var(--border-strong)'}`,
        transition: 'all 0.3s',
      }} />
      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{name}</span>
    </div>
  );
}
