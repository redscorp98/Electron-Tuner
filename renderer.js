const dialog = require('electron').remote.dialog
var audioCtx = new AudioContext;
let recording;
const PERIOD = 500; // 500 ms
const Pitchfinder = require('pitchfinder')
let mediaRecorder = null;
let audioInputs = null;
let gain = audioCtx.createGain();
gain.gain.value = 0.5;

// When device list changes this is called
navigator.mediaDevices.ondevicechange = function (event) {
    updateInputList()
}

// Updates the gain of output note
function updateGain(slider) {
    const currentGain = gain.gain.value
    const nextGain = slider.value / 100
    const step = (nextGain - currentGain) / 2
    gain.gain.value += step
    for (let i = 0; i < 1; i++) {
        setTimeout(function () { gain.gain.value += step }, 300 * i)
    }
}

// Input a string of note (e.g. "A3", "C5") and return the frequency
function getNoteFrequency(note = "") {
    try {
        const _note = note[0].toUpperCase() + note.substring(1)
        notes = Object.keys(noteFrequencies)
        if (notes.includes(_note)) {
            const frequency = noteFrequencies[_note]
            console.log(frequency)
            return frequency
        } else {
            console.log("Note not found")
            return 330
        }
    } catch (error) {

    }
}


// Modifies the note displayed in the text box if it's a valid note
function modifyNote(val) {
    let note = document.getElementById("output-note").value
    let currentNote = note[0].toUpperCase() + note.substring(1)
    const notes = Object.keys(noteFrequencies)
    if (notes.includes(currentNote)) {
        const index = notes.indexOf(currentNote)
        let nextIndex = index + parseInt(val)
        if (nextIndex === notes.length) {
            nextIndex = 0
        } else if (nextIndex === -1) {
            nextIndex = notes.length - 1
        }
        document.getElementById("output-note").value = notes[nextIndex]
    } else {
        dialog.showMessageBoxSync({ title: "Input error", message: "Invalid note input", type: "error" })
    }
}

// Sets up the media device input
async function setupDeviceInput(options) {
    if (audioInputs === null) {
        console.log("Nothing to do")
    }
    else {
        const device = (audioInputs.filter(input => input.label.includes(options.value)))
        mediaDevice = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: device.deviceId } } })
        // Uses default sample frequency of input device. Should be 48000 Hz
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
}

// Updates displayed list of audio devices
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

// Returns list of audio media devices
async function getMediaDevices() {
    let audioDevices = null
    try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        audioDevices = devices.filter(device => device.kind === "audioinput")
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
async function listen() {
    if (mediaRecorder !== null) {
        recording = window.setInterval(() => {
            mediaRecorder.start()
            window.setTimeout(() => {
                mediaRecorder.stop()
            }, PERIOD)
        }, 1000)
    }
}

// Stop recording audio from the microphone input
function stopListening() {
    clearInterval(recording)
}

/* 
    Fill a list of available audio inputs
    Sets up a device input if available
*/
async function main() {
    const inputReady = await updateInputList()
    updateDisplayFrequency()
    if (inputReady)
        setupDeviceInput(document.getElementById("audio-inputs"))
}

// Return nearest number in a list
function findNearestNote(val = 1) {
    const arr = Object.values(noteFrequencies)
    const notes = Object.keys(noteFrequencies)
    let lowestDiff = Math.abs(arr[0] - val);
    let nearest = notes[0];
    for (let i = 0; i < arr.length; i++) {
        let element = arr[i]
        let diff = val - element
        if (diff === 0) {
            return notes[i]
        }
        else if (Math.abs(diff) < lowestDiff) {
            lowestDiff = diff
            nearest = notes[i]
        }
    }
    return nearest
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
    console.log("Frequency: ", frequency, "Sample rate: ", sampleFrequency)
    if (frequency !== null & frequency < 5100) {
        updateDisplayFrequency(findNearestNote(frequency))
    }
}

function updateDisplayFrequency(note = null) {
    const id = document.getElementById("current-note")
    if (note === null) {
        // Dispaly a "?"
        id.innerText = "?"
    }
    else {
        // Display the string
        id.innerText = note
    }
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
function playTone(type = "sine", length = 4) {
    const frequency = getNoteFrequency(document.getElementById("output-note").value)
    const oscillator = audioCtx.createOscillator()
    oscillator.onended = function () {
        console.log('Your tone has now stopped playing!');
    };
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime)
    oscillator.type = type
    oscillator.connect(gain)
    gain.connect(audioCtx.destination);
    oscillator.start()
    oscillator.stop(audioCtx.currentTime + length);
}
noteFrequencies = {
    "C0": 16.35,
    "C#0": 17.32,
    "Db0": 17.32,
    "D0": 18.35,
    "D#0": 19.45,
    "Eb0": 19.45,
    "E0": 20.60,
    "F0": 21.83,
    "F#0": 23.12,
    "Gb0": 23.12,
    "G0": 24.50,
    "G#0": 25.96,
    "Ab0": 25.96,
    "A0": 27.50,
    "A#0": 29.14,
    "Bb0": 29.14,
    "B0": 30.87,
    "C1": 32.70,
    "C#1": 34.65,
    "Db1": 34.65,
    "D1": 36.71,
    "D#1": 38.89,
    "Eb1": 38.89,
    "E1": 41.20,
    "F1": 43.65,
    "F#1": 46.25,
    "Gb1": 46.25,
    "G1": 49.00,
    "G#1": 51.91,
    "Ab1": 51.91,
    "A1": 55.00,
    "A#1": 58.27,
    "Bb1": 58.27,
    "B1": 61.74,
    "C2": 65.41,
    "C#2": 69.30,
    "Db2": 69.30,
    "D2": 73.42,
    "D#2": 77.78,
    "Eb2": 77.78,
    "E2": 82.41,
    "F2": 87.31,
    "F#2": 92.50,
    "Gb2": 92.50,
    "G2": 98.00,
    "G#2": 103.83,
    "Ab2": 103.83,
    "A2": 110.00,
    "A#2": 116.54,
    "Bb2": 116.54,
    "B2": 123.47,
    "C3": 130.81,
    "C#3": 138.59,
    "Db3": 138.59,
    "D3": 146.83,
    "D#3": 155.56,
    "Eb3": 155.56,
    "E3": 164.81,
    "F3": 174.61,
    "F#3": 185.00,
    "Gb3": 185.00,
    "G3": 196.00,
    "G#3": 207.65,
    "Ab3": 207.65,
    "A3": 220.00,
    "A#3": 233.08,
    "Bb3": 233.08,
    "B3": 246.94,
    "C4": 261.63,
    "C#4": 277.18,
    "Db4": 277.18,
    "D4": 293.66,
    "D#4": 311.13,
    "Eb4": 311.13,
    "E4": 329.63,
    "F4": 349.23,
    "F#4": 369.99,
    "Gb4": 369.99,
    "G4": 392.00,
    "G#4": 415.30,
    "Ab4": 415.30,
    "A4": 440.00,
    "A#4": 466.16,
    "Bb4": 466.16,
    "B4": 493.88,
    "C5": 523.25,
    "C#5": 554.37,
    "Db5": 554.37,
    "D5": 587.33,
    "D#5": 622.25,
    "Eb5": 622.25,
    "E5": 659.26,
    "F5": 698.46,
    "F#5": 739.99,
    "Gb5": 739.99,
    "G5": 783.99,
    "G#5": 830.61,
    "Ab5": 830.61,
    "A5": 880.00,
    "A#5": 932.33,
    "Bb5": 932.33,
    "B5": 987.77,
    "C6": 1046.50,
    "C#6": 1108.73,
    "Db6": 1108.73,
    "D6": 1174.66,
    "D#6": 1244.51,
    "Eb6": 1244.51,
    "E6": 1318.51,
    "F6": 1396.91,
    "F#6": 1479.98,
    "Gb6": 1479.98,
    "G6": 1567.98,
    "G#6": 1661.22,
    "Ab6": 1661.22,
    "A6": 1760.00,
    "A#6": 1864.66,
    "Bb6": 1864.66,
    "B6": 1975.53,
    "C7": 2093.00,
    "C#7": 2217.46,
    "Db7": 2217.46,
    "D7": 2349.32,
    "D#7": 2489.02,
    "Eb7": 2489.02,
    "E7": 2637.02,
    "F7": 2793.83,
    "F#7": 2959.96,
    "Gb7": 2959.96,
    "G7": 3135.96,
    "G#7": 3322.44,
    "Ab7": 3322.44,
    "A7": 3520.00,
    "A#7": 3729.31,
    "Bb7": 3729.31,
    "B7": 3951.07,
    "C8": 4186.01,
    "C#8": 4434.92,
    "Db8": 4434.92,
    "D8": 4698.64,
    "D#8": 4978.03,
    "Eb8": 4978.03
}