const NOUNS: [string, 'm' | 'f' | 'v'][] = [
  ['Croissant', 'm'], ['Baguette', 'f'], ['Béret', 'm'], ['Chat', 'm'], ['Bicyclette', 'f'], ['Phare', 'm'],
  ['Tasse', 'f'], ['Accordéon', 'v'], ['Escargot', 'v'], ['Montgolfière', 'f'], ['Fromage', 'm'], ['Sardine', 'f'],
  ['Lanterne', 'f'], ['Violon', 'm'], ['Hibou', 'm'], ['Pétanque', 'f'], ['Parapluie', 'm'], ['Horloge', 'v'],
]
const QUALIFIERS = [
  'de Minuit', 'des Étoiles', 'Céleste', 'qui Rêve', 'du Nord', 'Magnifique', 'qui Danse',
  'Mélancolique', 'Fantastique', 'du Dimanche', 'sans Souci', 'de la Lune',
]

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

/** A whimsical French name for a new constellation. */
export function randomName(): string {
  const [noun, g] = pick(NOUNS)
  const article = g === 'm' ? 'Le ' : g === 'f' ? 'La ' : "L'"
  return `${article}${noun} ${pick(QUALIFIERS)}`
}

export const WISHES = [
  'May every croissant you meet this year be flaky all the way through.',
  'May the next song on shuffle be exactly the right one.',
  'May your coffee stay warm until the very last sip.',
  'May a friend call you right as you were about to call them.',
  'May you find a parking spot on the first try, every time.',
  'May your plants forgive you for the week you forgot them.',
  'May you laugh so hard this week that you have to sit down.',
  'May the bakery still have one left when you get there.',
  'May your next idea be the one you cannot stop thinking about.',
  'May every Monday feel a little like a Friday.',
  'May you sleep through the night and wake just before the alarm.',
  'May the weather be kind on the day it matters most.',
  'May someone tell you today how glad they are to know you.',
  'May your phone battery outlast your plans.',
  'May an old song surprise you and still sound perfect.',
  'May you always get the window seat.',
  'May the bug you have been chasing turn out to be a typo.',
  'May you find money in a coat you have not worn since winter.',
]

export const randomWish = () => pick(WISHES)
