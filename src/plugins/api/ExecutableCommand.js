const { next } = require('hooter/effects')
const { optionsToObject, compareNames } = require('../../common')
const buildConfig = require('./buildConfig')
const Command = require('./Command')
const Option = require('./Option')


class ExecutableCommand extends Command {
  getFullName() {
    let parentName = this.parent ? this.parent.getFullName() : []
    return parentName.concat(this.config.name)
  }

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
      config, _command, context, ...args
    ) {
      let { fullName, options } = _command

      if (compareNames(fullName, command)) {
        options = optionsToObject(options)
        context = yield handler(options, context, ...args)
      }

      return yield next(config, _command, context, ...args)
    })

    return this
  }

  execute(command, options) {
    let request

    if (Array.isArray(command)) {
      request = command
    } else {
      if (arguments.length === 1 && typeof command !== 'string') {
        options = command
        command = null
      }

      let fullName = this.getFullName()

      if (command) {
        fullName = fullName.concat(command.split(' '))
      }

      request = [{ fullName, options }]
    }

    return this.lifecycle
      .toot('execute', request)
      .catch((err) => this.lifecycle.toot('error', err))
  }

  start() {
    let lifecycle = this.lifecycle

    if (!lifecycle || this.parent) {
      throw new Error('start() can only be used on the default command (the app)')
    }

    try {
      let config = buildConfig(this, true)
      lifecycle.toot('configure', config)
      return lifecycle.toot('start')
    } catch (err) {
      lifecycle.toot('error', err)
    }
  }

  catch(handler) {
    let lifecycle = this.lifecycle

    if (!lifecycle || this.parent) {
      throw new Error('hook() can only be used on the default command (the app)')
    }

    lifecycle.hook('error', function* (_, ...args) {
      let result = yield handler(...args)
      return result ? result : yield next(_, ...args)
    })

    return this
  }
}

ExecutableCommand.Option = Option

module.exports = ExecutableCommand
