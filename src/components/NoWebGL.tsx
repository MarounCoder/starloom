export function NoWebGL({ lost }: { lost?: boolean }) {
  return (
    <div className="nowebgl" role="alert">
      <p className="eyebrow">A universe you can play</p>
      <h1 className="wordmark">Starloom</h1>
      <p>{lost ? 'The graphics card stopped drawing the sky.' : 'Starloom needs WebGL, which this browser has turned off.'}</p>
      {lost && (
        <button type="button" className="pill" onClick={() => location.reload()}>
          Reload
        </button>
      )}
    </div>
  )
}
