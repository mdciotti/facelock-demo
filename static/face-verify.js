/* eslint-disable */

/*\
|*| Face-Verify.js
|*| originally by MachineBox
|*| adapted by Maxwell Ciotti
\*/

class FaceVerify {
    constructor(options) {
        this.options = options || {}
        this.options.facebox = this.options.facebox || 'http://localhost:8080'
        this.options.snapshotInterval = this.options.snapshotInterval || 1000
        this.options.onSecure = this.options.onSecure || function(){}
        this.options.onInsecure = this.options.onInsecure || function(){}
        this.options.error = this.options.error || console.warn
        this.possible = true
        this.canvas = document.createElement('canvas')
        this.video = this.options.video || document.querySelector(this.options.videoSelector)
        this.timer = null
        this.stopped = true

        if (!this.video) {
            this.possible = false
            console.error('face-verify: must provide a <video> via videoSelector option')
            this.options.error('failed to access video')
        }
        if (!navigator.mediaDevices) {
            this.possible = false
            console.error('face-verify: getUserMedia is not supported in this browser')
            this.options.error('camera not available')
        }
    }

    start(shouldStartTimer) {
        if (!this.possible) {
            console.error('face-verify: cannot start (see previous errors)')
            this.options.error('failed to start')
            return
        }

        this.stopped = !shouldStartTimer
        if (this.video.srcObject !== null) {
            this.timer = setTimeout(this.snapshot.bind(this), this.options.snapshotInterval)
            return
        }

        const constraints = { audio: false, video: { width: 320, height: 240 } }
        navigator.mediaDevices.getUserMedia(constraints)
        .then((mediaStream) => {
            this.video.srcObject = mediaStream
            this.timer = setTimeout(this.snapshot.bind(this), this.options.snapshotInterval)
        }).catch((err) => {
            console.error('face-verify: user did not give access to the camera', err)
            this.options.error('failed to access camera')
        })
    }

    stop(shouldStopCamera) {
        // if (this.stopped) { return }
        this.stopped = true
        clearTimeout(this.timer)
        if (this.xhr) this.xhr.abort()

        if (shouldStopCamera && this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(t => t.stop())
            this.video.srcObject = null
        }
    }

    getBase64Snapshot() {
        this.canvas.width = this.video.videoWidth
        this.canvas.height = this.video.videoHeight
        const ctx = this.canvas.getContext('2d')
        ctx.drawImage(this.video, 0, 0, this.video.videoWidth, this.video.videoHeight)
        return this.canvas.toDataURL('image/jpeg') 
    }

    dataURItoBlob(dataURI) {
        let byteString
        const URIParts = dataURI.split(',')
        if (URIParts[0].indexOf('base64') < 0) {
            byteString = atob(URIParts[1])
        } else {
            byteString = unescape(URIParts[1])
        }

        const mimeString = URIParts[0].split(':')[1].split(';')[0]
        const ia = new Uint8Array(byteString.length)
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i)
        }

        return new Blob([ia], { type: mimeString })
    }

    teach({ name, id }, errorHandler, successHandler) {
        // TODO: return a promise
        // TODO: should first check if face already exists
        const xhr = this.xhr = new XMLHttpRequest()
        const fd = new FormData()
        fd.append('name', name)
        fd.append('id', id)
        this.canvas.toBlob((blob) => {
            const file = new File([blob], `${id}.jpg`, { type: 'image/jpeg' })
            console.log(file)
            fd.append('file', file)
            xhr.open('POST', `${this.options.facebox}/facebox/teach`)
            xhr.onreadystatechange = () => {
                if (xhr.readyState !== 4 || xhr.status === 0) { return }

                if (xhr.status !== 200) {
                    console.warn(xhr, arguments)
                    errorHandler('failed to teach face')
                    return
                }

                const response = JSON.parse(xhr.responseText)
                if (!response.success) {
                    console.warn(xhr, arguments)
                    errorHandler('failed to teach face')
                    return
                }

                console.log(`Successfully taught Facebox user ${id} (${name})`)
                successHandler()
            }
            xhr.send(fd)
        }, 'image/jpeg')
    }

    snapshot() {
        if (this.stopped) { return }
        const imageData = this.getBase64Snapshot().split(',')[1]
        const xhr = this.xhr = new XMLHttpRequest()
        xhr.open('POST', `${this.options.facebox}/facebox/check`)
        xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8')
        xhr.onreadystatechange = () => {
            if (xhr.readyState !== 4 || xhr.status === 0) { return }

            if (xhr.status !== 200) {
                console.warn(xhr, arguments)
                let msg = 'bad response from Facebox: '
                if (xhr.responseText) {
                    msg += xhr.responseText
                } else {
                    msg += 'Check the console for technical information'
                }
                this.options.error(msg)
                this.timer = setTimeout(this.snapshot.bind(this), this.options.snapshotInterval)
                return
            }

            const response = JSON.parse(xhr.responseText)
            if (!response.success) {
                console.warn(xhr, arguments)
                this.options.error(response.error || 'Facebox: something went wrong, check the console for technical information')
                this.timer = setTimeout(this.snapshot.bind(this), this.options.snapshotInterval)
                return
            }

            if (response.facesCount == 0) {
                this.options.onInsecure('No faces detected')
            } else if (response.facesCount > 1) {
                this.options.onInsecure('Multiple faces detected')
            } else {
                if (!response.faces[0].matched) {
                    this.options.onInsecure('Facebox doesn\'t recognize you')
                } else {
                    this.options.onSecure(response.faces[0])
                }
            }

            this.timer = setTimeout(this.snapshot.bind(this), this.options.snapshotInterval)
        }
        xhr.send(JSON.stringify({ base64: imageData }))
    }
}

