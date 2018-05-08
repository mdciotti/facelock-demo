const MESSAGES = {}
MESSAGES.HIDDEN = ''
MESSAGES.LOOKING = 'Looking for you...'
MESSAGES.NOT_RECOGNIZED = 'User not recognized'
MESSAGES.SUCCESS = 'Yup, it\'s you!'
MESSAGES.WELCOME = 'Welcome, $1!'
MESSAGES.IDENTIFYING = 'Identifying...'
MESSAGES.REGISTERING = 'Registering...'
MESSAGES.OTHER = '$1'

Vue.component('FaceLock', {
  render: function (h) {
    const onNameInput = (event) => {
      this.name = event.target.value
    }
    const onUsernameInput = (event) => {
      this.username = event.target.value
    }
    return h('div', { attrs: { id: 'facelock-app' }, class: { open: this.isOpen } }, [
      h('div', { class: 'page-cover', on: { click: this.hide } }),
      h('div', { class: 'modal' }, [
        h('div', { class: [ 'page', this.registered ? 'verify' : 'register' ] }, [
          h('div', { class: 'header' }, [
            h('div', { class: 'logo' }, [
              h('img', { attrs: { src: '/static/facelock.svg' } }),
              h('h1', {}, [
                h('span', { class: 'face' }, 'Face'),
                h('span', { class: 'lock' }, 'Lock')
              ])
            ]),
            h('button', { class: 'register', on: { click: this.showRegister } }, 'Register'),
            h('button', { on: { click: this.hide } }, 'Close')
          ]),
          h('div', { ref: 'eye', class: 'eye' }, [
            h('div', { class: 'brow' }, [
              h('div', { class: 'left' }),
              h('div', { class: 'right' })
            ]),
            h('div', { class: 'pupil' }, [
              h('div', { class: 'left' }),
              h('div', { class: 'right' })
            ])
          ]),
          h('div', { class: [ 'video', { recognized: this.recognized, unrecognized: this.unrecognized } ] }, [
            h('video', { ref: 'video', attrs: { autoplay: true } })
          ]),
          h('div', { class: 'form' }, [
            h('div', {}, [
              h('input', { domProps: { value: this.name }, attrs: { placeholder: 'full name' }, on: { input: onNameInput } })
            ]),
            h('div', {}, [
              h('input', { domProps: { value: this.username }, attrs: { placeholder: 'username' }, on: { input: onUsernameInput } })
            ]),
            h('div', {}, [
              h('button', { on: { click: this.register } }, 'Register')
            ])
          ]),
          h('div', { class: 'message' }, this.message)
        ])
      ])
    ])
  },

  props: {
    open: {
      type: Boolean,
      default: false
    }
  },

  data () {
    return {
      isOpen: this.$props.open,
      name: '',
      username: '',
      registered: true,
      fv: null,
      recognized: false,
      unrecognized: false,
      unrecognizedCount: 0,
      recognizedCount: 0,
      requiredCount: 3,
      message: '',
      messageClass: '',
      eye: null
    }
  },

  mounted () {
    const protocol = window.location.protocol
    // const protocol = 'https:'
    const host = '18.237.102.7'
    const port = 8080
    this.fv = new FaceVerify({
      facebox: `${protocol}//${host}:${port}`,
      video: this.$refs.video,
      snapshotInterval: 1000,
      error: this.onError,
      onSecure: this.onSecure,
      onInsecure: this.onInsecure
    })
    window.FaceLock = this
    this.setStatus('HIDDEN')
  },

  methods: {
    hide () {
      this.reset()
      this.isOpen = false
      this.setStatus('HIDDEN')
      if (this.fv.timer) this.fv.stop(true)
    },

    show () {
      this.reset()
      this.isOpen = true
      this.fv.start(true)
      this.setStatus('LOOKING')
    },

    reset () {
      this.username = ''
      this.name = ''
      this.unrecognized = false
      this.recognized = false
      this.recognizedCount = 0
      this.unrecognizedCount = 0
    },

    showRegister () {
      this.registered = false
      this.fv.start(false)
    },

    showVerify () {
      this.fv.start(true)
      this.setStatus('LOOKING')
    },

    register () {
      const name = this.name
      const id = this.username
      console.log(`Registering user ${id}...`)
      this.setStatus('REGISTERING')
      this.registered = true
      this.fv.teach({ name, id }, (msg) => {
        this.setStatus('OTHER', `Error: ${msg}`)
      }, () => {
        // Wait for 5-second cooldown (teaching period)
        setTimeout(() => {
          this.reset()
          this.showVerify()
        }, 5000)
      })
    },

    setStatus (messageClass, ...args) {
      let message = MESSAGES[messageClass]
      args.forEach((arg, i) => {
        message = message.replace(/\$\d/, args[i])
      })
      this.message = message
      this.messageClass = messageClass
      this.$refs.eye.classList.remove('success')
      this.$refs.eye.classList.remove('looking')
      this.$refs.eye.classList.remove('spinning')
      switch (messageClass) {
        case 'LOOKING':
          this.$refs.eye.classList.add('looking')
          break
        case 'IDENTIFYING':
        case 'REGISTERING':
          this.$refs.eye.classList.add('spinning')
          break
        case 'SUCCESS':
        case 'WELCOME':
          this.$refs.eye.classList.add('success')
          break
        default:
      }
    },

    onError (error) {
      this.setStatus('OTHER', `Error: ${error}`)
    },

    onSecure (face) {
      this.recognized = true
      this.recognizedCount += 1
      if (this.recognizedCount === this.requiredCount) {
        this.setStatus('WELCOME', face.name)
        this.fv.stop(true)
        // setTimeout(this.hide.bind(this), 1000)
      } else {
        this.setStatus('IDENTIFYING')
      }
    },

    onInsecure (message) {
      this.unrecognized = true
      if (this.unrecognizedCount === this.requiredCount) {
        this.setStatus('NOT_RECOGNIZED')
        this.fv.stop(false)
        this.showRegister()
      } else if (message === 'Facebox doesn\'t recognize you') {
        this.unrecognizedCount += 1
        this.setStatus('NOT_RECOGNIZED')
      } else if (message === 'No faces detected') {
        this.setStatus('LOOKING')
      } else if (message === 'Multiple faces detected') {
        this.setStatus('LOOKING')
      } else {
        this.setStatus('OTHER', message)
      }
    }
  }
})

new Vue({
  el: document.body.appendChild(document.createElement('div')),
  render: h => h('FaceLock', { props: { isOpen: false } })
})
