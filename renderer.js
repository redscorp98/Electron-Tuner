var audioCtx = new AudioContext;
let recording;
const PERIOD = 500; // 500 ms
const Pitchfinder = require('pitchfinder')
let mediaRecorder;
main();

async function setupInput() {
    return navigator.mediaDevices.getUserMedia({ audio: true })
        .then(device => {
            mediaRecorder = new MediaRecorder(device)
            return true
        })
        .catch(error => {
            if (error.name === "NotFoundError") {
                console.error("ERROR. No audio input detected.")
            } else {
                console.error(error)
            }
            return false
        })
}

async function record() {
    recording = window.setInterval(() => {
        mediaRecorder.start()
        window.setTimeout(() => {
            mediaRecorder.stop()
        }, PERIOD)
    }, 1000)
}

function stop() {
    clearInterval(recording)
}

async function main() {
    await setupInput();
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
}

function play(buf) {
    var source = audioCtx.createBufferSource();
    source.buffer = buf;
    // Connect to the final output node (the speakers)
    source.connect(audioCtx.destination);
    // Play immediately
    source.start(0);
}

async function getFrequency(sampleFrequency, byteArray) {
    const detectPitch = Pitchfinder.YIN(sampleFrequency)
    const frequency = detectPitch(byteArray)
    console.log("Frequency: ", frequency)
}

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