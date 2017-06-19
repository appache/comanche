const Hooter = require('hooter')
const defaultSchema = require('./schema')


const EVENTS = [
  ['schema', 'sync'],
  ['init', 'sync'],
  ['configure', 'sync'],
  ['start', 'sync'],
  ['execute', 'async'],
  ['process', 'async'],
  ['handle', 'async'],
  ['error', 'sync'],
]


module.exports = function comanche(args, plugins) {
  let lifecycle = new Hooter()

  if (!Array.isArray(plugins)) {
    throw new Error('Plugins must be an array of functions')
  }

  EVENTS.forEach(([event, mode]) => {
    lifecycle.register(event, mode)
  })
  plugins.forEach((plugin) => {
    plugin(lifecycle.bind(plugin))
  })

  let schema = lifecycle.tootWith('schema', (schema) => schema, defaultSchema)

  return lifecycle.tootWith('init', (_, createApi) => {
    if (!createApi) {
      throw new Error(
        'No interface has been defined. At least one plugin must define ' +
        'an interface during the "init" event'
      )
    }

    if (typeof createApi !== 'function') {
      throw new Error('The result of "init" must be a function')
    }

    return createApi(...args)
  }, schema)
}
