const { next } = require('hooter/effects')
const normalizeCommands = require('./normalizeCommands')


module.exports = function executionPlugin(lifecycle) {
  function executeOne(command, context) {
    let { outputName, options } = command
    let handlerOptions = {}

    if (!outputName) {
      throw new Error('Commands must have an output name in the end of "execute.one"')
    }

    if (options) {
      options.forEach((option) => {
        if (!option.outputName) {
          throw new Error('All options must have an output name in the end of "execute.one"')
        }

        handlerOptions[option.outputName] = option.value
      })
    }

    return lifecycle.tootAsync(
      'execute.handle', outputName, handlerOptions, context
    )
  }

  function* executeBatch(commands) {
    let context

    for (let i = 0; i < commands.length; i++) {
      context = yield lifecycle.tootAsyncWith(
        'execute.one', executeOne, commands[i], context
      )
    }

    return context
  }


  let config

  lifecycle.hook('start', function* (_config) {
    config = yield next(_config)
    return config
  })

  lifecycle.hookAfter('execute', (commands) => {
    if (!Array.isArray(commands) || commands.length === 0) {
      throw new Error('The first argument of execute must be an array of commands')
    }

    commands = normalizeCommands(commands, config)
    return lifecycle.tootAsyncWith('execute.batch', executeBatch, commands)
  })
}