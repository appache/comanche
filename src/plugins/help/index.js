const { next } = require('hooter/effects')
const modifySchema = require('./modifySchema')


let optionCounter = 0

function createOption() {
  return {
    id: `help${++optionCounter}`,
    name: 'help',
    aliases: ['h'],
    description: 'Show help',
    type: 'boolean',
    isHelpOption: true, // Probably not the best way to identify the options
  }
}

function injectOptions(config) {
  let helpOptions = []
  let commands = config.commands.map((command) => {
    let { help, options } = command

    if (!help) {
      return command
    }

    let option = createOption()
    helpOptions.push(option)
    options = options ? options.concat(option.id) : [option.id]
    return Object.assign({}, command, { options })
  })

  if (!helpOptions.length) {
    return config
  }

  let options = config.options ?
    config.options.concat(helpOptions) :
    helpOptions
  return Object.assign({}, config, { commands, options })
}

module.exports = function helpPlugin(lifecycle) {
  lifecycle.hook('schema', function* (schema) {
    schema = modifySchema(schema)
    return yield next(schema)
  })

  lifecycle.hook('configure', function* (_, config) {
    config = injectOptions(config)
    return yield next(_, config)
  })

  lifecycle.hookEnd('process', function* (_, command) {
    let { inputName, options, config } = command

    let isHelpAsked = options && options.some((option) => {
      return option.config && option.config.isHelpOption
    })

    if (!isHelpAsked) {
      return yield next(_, command)
    }

    let help = config && config.help
    return (typeof help === 'string') ?
      help :
      `Help is unavailable for "${inputName}"`
  })
}
