const { next } = require('hooter/effects')
const {
  InputError, findDefaultCommand, findCommandByFullName, getCommandFromEvent,
} = require('../../common')
const composeHelp = require('./help')
const parseArgs = require('./parseArgs')
const modifySchema = require('./modifySchema')


function print(string, level = 'log') {
  /* eslint-disable no-console */
  console[level]()
  console[level](string)
  console[level]()
}

function handleResult(result) {
  if (typeof result === 'string') {
    print(result)
  }
}

function handleError(config, err, event) {
  if (!(err instanceof InputError)) {
    return print(err, 'error')
  }

  let errText = err.message
  let commandConfig = findDefaultCommand(config, true)
  let commandName

  if (err.command) {
    let command = err.command
    let { fullName, inputName } = command
    commandConfig = findCommandByFullName(config, fullName, true)
    commandName = inputName
  } else if (event) {
    let command = getCommandFromEvent(event)

    if (command.config) {
      commandName = command.inputName
      commandConfig = command.config
    } else {
      let parentName = command.fullName.slice(0, -1)
      commandConfig = findCommandByFullName(config, parentName, true)
      commandName = parentName.join(' ')
    }
  }

  if (commandConfig) {
    errText += '\n\n'
    errText += composeHelp(commandConfig, commandName)
  }

  return print(errText, 'error')
}

module.exports = function cliPlugin(lifecycle) {
  lifecycle.hook('schema', function* (schema) {
    schema = modifySchema(schema)
    return yield next(schema)
  })

  lifecycle.hook('start', function* (config, ...args) {
    Promise.resolve()
      .then(() => {
        let args = process.argv.slice(2)
        return parseArgs(args, config)
      })
      .then((request) => {
        return lifecycle.toot('execute', request)
      })
      .then(handleResult)
      .catch((err) => {
        lifecycle.tootWith('error', handleError, err)
      })

    return yield next(config, ...args)
  })

  lifecycle.hook('process', function* (_, command) {
    let { inputName, options, config } = command

    let isHelpAsked = options && options.some((option) => {
      return option.config && option.config.isHelpOption
    })

    if (!isHelpAsked) {
      return yield next(_, command)
    }

    if (config) {
      if (typeof config.help === 'string') {
        return config.help
      } else {
        return composeHelp(config, inputName)
      }
    }

    return `Help is unavailable for "${inputName}"`
  })
}
