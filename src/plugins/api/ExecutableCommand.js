const { next } = require('hooter/effects')
const { optionsToObject, compareNames } = require('../../common')
const Command = require('./Command')
const Option = require('./Option')


function buildConfig(rootCommand) {
  let commands = [rootCommand.getConfig()]
  let options = rootCommand.options.map((option) => option.getConfig())

  if (rootCommand.commands) {
    rootCommand.commands.forEach((command) => {
      let config = buildConfig(command)
      commands = commands.concat(config.commands)
      options = options.concat(config.options)
    })
  }

  return { commands, options }
}


class ExecutableCommand extends Command {
  handle(command, handler) {
    if (arguments.length === 2) {
      if (typeof command !== 'string') {
        throw new Error('A command name must be a string')
      }

      if (!/^[a-z0-9 _-]+$/.test(command)) {
        throw new Error(
          'A command name can only contain letters, numbers, underscores, hyphens and spaces'
        )
      }

      if (command.charAt(0) === '-') {
        throw new Error(
          'A hyphen is not allowed as the first character of a command name'
        )
      }

      command = this.getFullName().concat(command.split(' '))
    } else {
      handler = command
      command = this.getFullName()
    }

    if (typeof handler !== 'function') {
      throw new Error('A handler must be a function')
    }

    this.lifecycle.hook('handle', function* (
      _command, context, ...args
    ) {
      let { outputName, options } = _command

      if (compareNames(outputName, command)) {
        options = optionsToObject(options)
        context = yield handler(options, context, ...args)
      }

      return yield next(_command, context, ...args)
    })

    return this
  }

  execute(command, options) {
    if (typeof command !== 'string') {
      options = command
      command = null
    }

    let name = this.getFullName()

    if (command) {
      name = name.concat(command.split(' '))
    }

    let lifecycle = this.lifecycle
    return lifecycle
      .toot('execute', [{ name, options }])
      .catch((err) => lifecycle.toot('error', err))
  }

  start() {
    let lifecycle = this.lifecycle

    if (!lifecycle || this.parent) {
      throw new Error('start() can only be used on the default command (the app)')
    }

    try {
      let config = buildConfig(this)
      return lifecycle.tootWith('start', (_config) => _config, config)
    } catch (err) {
      lifecycle.toot('error', err)
    }
  }
}

ExecutableCommand.Option = Option

module.exports = ExecutableCommand
