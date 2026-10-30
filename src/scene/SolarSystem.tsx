import { BODY_IDS } from '../lib/space/bodies'
import { Body } from './Body'
import { Sun } from './Sun'

export function SolarSystem({ segments = 64 }: { segments?: number }) {
  return (
    <>
      <ambientLight intensity={0.04} />
      <Sun />
      {BODY_IDS.filter(id => id !== 'sun').map(id => (
        <Body key={id} id={id} segments={segments} />
      ))}
    </>
  )
}
