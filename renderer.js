let arr;
let arrBuffer;
let arrBuffer2;
var audioCtx = new AudioContext;
var analyser = audioCtx.createAnalyser();
let recording;
let execute = 0;
const PERIOD = 500; // 500 ms
let ctx;
window.onload = function () { ctx = document.getElementById('myChart').getContext('2d'); }
const chart = require("electron-chartjs")
const Pitchfinder = require('pitchfinder')
main();



async function setupInput() {
    return navigator.mediaDevices.getUserMedia({ audio: true })
        .then(device => {
            return new MediaRecorder(device)
        })
        .catch(error => {
            if (error.name === "NotFoundError") {
                console.error("ERROR. No audio input detected.")
            } else {
                console.error(error)
            }
            return null
        })

}

let mediaRecorder;

// setupInput().then(recorder => {
//     mediaRecorder = recorder;
// })


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
    mediaRecorder = await setupInput();
    mediaRecorder.ondataavailable = async function (e) {
        const blob = e.data
        const stream = blob.stream()
        const reader = stream.getReader()
        reader.read().then(buffer => {
            audioCtx.decodeAudioData(buffer.value.buffer).then(audioBuffer => {
                audioData = audioBuffer.getChannelData(0)
                // fetchStream()
                writeCSV(audioData)
                // console.log(audioData)
                // console.log("SaMPLE RATE: ", audioBuffer.sampleRate)
                getFrequency(audioBuffer.sampleRate, audioData)
                // play(audioBuffer);
            }).catch(e => {
                console.log(e)
            })
        })

        // const arr = await reader.read()
        // arrBuffer = arr.value.buffer;
        // console.log("Fetch ", arrBuffer)



        // const response = await fetch(URL.createObjectURL(e.data))
        // const arrBuffer2 = await response.arrayBuffer()
        // const audioBuffer = await audioCtx.decodeAudioData(arrBuffer2)
        // const audioData = audioBuffer.getChannelData(0)
        /*         fetch(URL.createObjectURL(e.data)).then(response => {
                    response.arrayBuffer().then(buffer => {
                        console.log("in", buffer)
                        audioCtx.decodeAudioData(buffer).then(audioBuffer => {
                            audioData = audioBuffer.getChannelData(0)
                            fetchStream()
                            writeCSV(audioData)
                            // console.log(audioData)
                            // console.log("SaMPLE RATE: ", audioBuffer.sampleRate)
                            getFrequency(audioBuffer.sampleRate, audioData)
                            // play(audioBuffer);
                        }).catch(e => {
                            console.log(e)
                        })
                    })
                }) */
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

async function fetchStream() {
    if (blob) {
        const stream = blob.stream()
        const reader = stream.getReader()
        const arr = await reader.read()
        arrBuffer = arr.value.buffer;
        console.log("Fetch ", arrBuffer)
    }
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

function weee() {
    const createCsvWriter = require('csv-writer').createArrayCsvWriter;
    const csvWriter = createCsvWriter({
        header: ['Index', 'Amplitude'],
        path: 'file.csv'
    });
    const records = [
        ['Bob', 'French, English'],
        ['Mary', 'English']
    ];

    csvWriter.writeRecords(records)       // returns a promise
        .then(() => {
            console.log('...Done');
        });

}