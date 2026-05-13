import { copyFile } from 'node:fs/promises'

const compatibilityAssets = [
  ['dist/assets/index-hANEIGr2.js', 'dist/assets/index-Cv8M3TEo.js'],
  ['dist/assets/index-CBsHZEYD.css', 'dist/assets/index-B5DME9Pb.css'],
]

await Promise.all(
  compatibilityAssets.map(([source, target]) => copyFile(source, target)),
)
