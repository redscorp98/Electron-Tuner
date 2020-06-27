var audioCtx = new AudioContext;
let recording;
const PERIOD = 500; // 500 ms
const Pitchfinder = require('pitchfinder')
let mediaRecorder;
let audioInputs;

// When device list changes this is called
navigator.mediaDevices.ondevicechange = function (event) {
    updateInputList()
}


async function setupInput(options) {
    if (audioInputs === null) {
        console.log("Nothing to do")
    }
    else {
        const device = (audioInputs.filter(input => input.label.includes(options.value)))
        mediaDevice = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: device.deviceId } } })
        mediaRecorder = new MediaRecorder(mediaDevice)
        mediaRecorder.ondataavailable = async function (e) {
            const blob = e.data
            const stream = blob.stream()
            const reader = stream.getReader()
            reader.read().then(buffer => {
                audioCtx.decodeAudioData(buffer.value.buffer).then(audioBuffer => {
                    audioData = audioBuffer.getChannelData(0)
                    // writeCSV(audioData)
                    getFrequency(audioBuffer.sampleRate, audioData)
                }).catch(e => {
                    console.log(e)
                })
            })
        }
        console.log(mediaRecorder)
    }
    // return navigator.mediaDevices.getUserMedia({ audio: true })
    //     .then(device => {
    //         mediaRecorder = new MediaRecorder(device)
    //         return true
    //     })
    //     .catch(error => {
    //         if (error.name === "NotFoundError") {
    //             console.error("ERROR. No audio input detected.")
    //         } else {
    //             console.error(error)
    //         }
    //         return false
    //     })
}

async function updateInputList() {
    let select = document.getElementById("audio-inputs");
    const inputs = await getMediaDevices()
    audioInputs = inputs
    if (inputs === null) {
        console.log("No inputs to display")
        return false
    } else {
        inputs.forEach(input => {
            select.options[select.options.length] = new Option(input.label.slice(0, -12))
        });
        return true
    }

}


async function getMediaDevices() {
    let audioDevices = []
    try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        audioDevices = devices.filter(device => device.kind === "audioinput")
        console.log(audioDevices)
        // devices = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: } } })
    } catch (error) {
        console.error(error)
    }
    return audioDevices
}

/* 
    Record audio from microphone input
    Record for PERIOD
    Stop recording for 1000 - PERIOD
 */
async function record() {
    recording = window.setInterval(() => {
        mediaRecorder.start()
        window.setTimeout(() => {
            mediaRecorder.stop()
        }, PERIOD)
    }, 1000)
}

// Stop recording audio from the microphone input
function stop() {
    clearInterval(recording)
}

/* 
    Setup mediaRecorder interrupt and input
*/
async function main() {
    // await setupInput();
    updateInputList()
    /* mediaRecorder.ondataavailable = async function (e) {
        const blob = e.data
        const stream = blob.stream()
        const reader = stream.getReader()
        reader.read().then(buffer => {
            audioCtx.decodeAudioData(buffer.value.buffer).then(audioBuffer => {
                audioData = audioBuffer.getChannelData(0)
                // writeCSV(audioData)
                getFrequency(audioBuffer.sampleRate, audioData)
            }).catch(e => {
                console.log(e)
            })
        })
    } */
}

// Play most recently recorded audio
function play(buf) {
    var source = audioCtx.createBufferSource();
    source.buffer = buf;
    // Connect to the final output node (the speakers)
    source.connect(audioCtx.destination);
    // Play immediately
    source.start(0);
}

// Calculate frequecny of most recently recorded audio buffer
async function getFrequency(sampleFrequency, byteArray) {
    const detectPitch = Pitchfinder.YIN(sampleFrequency)
    const frequency = detectPitch(byteArray)
    // Sometimes frequency is null
    console.log("Frequency: ", frequency)
}

// Writes CSV of recorded audio array
async function writeCSV(arr = []) {
    const createCsvWriter = require('csv-writer').createArrayCsvWriter;
    const csvWriter = createCsvWriter({
        header: ['Index', 'Amplitude'],
        path: 'file.csv'
    });
    let output = [];
    for (let i = 0; i < arr.length; i++) {
        output.push([i, arr[i]])
    }
    console.log(output)
    csvWriter.writeRecords(output).then(() => {
        console.log("Complete")
    })
}

/*  Plays a tone of input frequency Hz
    type of wave: sine, sqaure, sawtooth, triangle or custom (https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode/type)
    length seconds
 */
function playTone(frequency = 330, type = "sine", length = 6) {
    const oscillator = audioCtx.createOscillator()
    oscillator.onended = function () {
        console.log('Your tone has now stopped playing!');
    };
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime)
    oscillator.type = type
    oscillator.connect(audioCtx.destination)
    oscillator.start()
    oscillator.stop(audioCtx.currentTime + length);
}