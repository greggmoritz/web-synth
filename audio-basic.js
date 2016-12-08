(function () {

    var actx;
    var analyzer;
    var osc1;
    var masterGain;
    var panner;
    var currentGain = 0.5;
    var dest;
    var baseHz = 440;
    var adjNoteRelationship = Math.pow(2, 1/12);
    var getFreq = function (baseFreq, halfSteps) {
        return baseFreq * Math.pow(adjNoteRelationship, halfSteps);
    };
    var numberOfKeysPressed = 0;
    var keysToNotes = {
        "a": "C",
        "w": "C#",
        "s": "D",
        "e": "D#",
        "d": "E",
        "f": "F",
        "t": "F#",
        "g": "G",
        "y": "G#",
        "h": "A",
        "u": "A#",
        "j": "B",
        "k": "C'",
        "o": "C#'",
        "l": "D'"
    };
    var notesToHz = {
        "C": getFreq(baseHz, -9),
        "C#": getFreq(baseHz, -8),
        "D": getFreq(baseHz, -7),
        "D#": getFreq(baseHz, -6),
        "E": getFreq(baseHz, -5),
        "F": getFreq(baseHz, -4),
        "F#": getFreq(baseHz, -3),
        "G": getFreq(baseHz, -2),
        "G#": getFreq(baseHz, -1),
        "A": baseHz,
        "A#": getFreq(baseHz, 1),
        "B": getFreq(baseHz, 2),
        "C'": getFreq(baseHz, 3),
        "C#'": getFreq(baseHz, 4),
        "D'": getFreq(baseHz, 5),
    }

    function initAudio () {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        analyzer = actx.createAnalyser();
        initAnalyzer(analyzer);
        osc1 = window.osc1 = actx.createOscillator();
        masterGain = window.masterGain = actx.createGain();
        masterGain.gain.value = 0;

        //
        // wire up signal path
        //
        osc1.connect(masterGain);

        masterGain.connect(analyzer);
        analyzer.connect(actx.destination);
        // initiate sound
        osc1.start();
    };

    function initAnalyzer(analyser) {
        // lifted from: https://mdn.github.io/voice-change-o-matic/
        var canvas = document.getElementById("viz");
        var canvasCtx = canvas.getContext("2d");
        var WIDTH = canvas.width;
        var HEIGHT = canvas.height;

        analyser.fftSize = 2048;
        var bufferLength = analyser.frequencyBinCount;
        var dataArray = new Uint8Array(bufferLength);

        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

        function draw() {
            drawVisual = requestAnimationFrame(draw);
            analyser.getByteTimeDomainData(dataArray);
            canvasCtx.fillStyle = "#333333";
            canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
            canvasCtx.lineWidth = 2;
            canvasCtx.strokeStyle = "#298fce";
            canvasCtx.beginPath();
            var sliceWidth = WIDTH * 1.0 / bufferLength;
            var x = 0;
            for (var i = 0; i < bufferLength; i++) {
                var v = dataArray[i] / 128.0;
                var y = v * HEIGHT / 2;
                if (i === 0) {
                    canvasCtx.moveTo(x, y);
                } else {
                    canvasCtx.lineTo(x, y);
                }
                x += sliceWidth;
            }

            canvasCtx.lineTo(canvas.width, canvas.height / 2);
            canvasCtx.stroke();
        };

        draw();
    }

    function initListeners () {
        var osc1Form = document.getElementById("osc1");
        var masterGainControl = document.getElementById("osc1-gain");
        var osc1WaveformRadios = document.querySelectorAll("[name='osc1-waveform']");
        var attackTime = 0.001;
        var decayTime = 0.001;

        // On keypress
        document.onkeypress = function (event) {
            if (event.repeat) {
                return;
            }
            var key = event.key;
            if (Object.keys(keysToNotes).includes(key)) {
                numberOfKeysPressed++;
                var noteName = keysToNotes[key];
                masterGain.gain.setValueAtTime(0, actx.currentTime);
                masterGain.gain.cancelScheduledValues(actx.currentTime);
                masterGain.gain.linearRampToValueAtTime(currentGain, actx.currentTime + attackTime);
                // handle decay
                // masterGain.gain.linearRampToValueAtTime(0, actx.currentTime + attackTime + decayTime);
                osc1.frequency.value = notesToHz[noteName];
            }
        };
        document.onkeyup = function (event) {
            var key = event.key;
            if (Object.keys(keysToNotes).includes(key)) {
                numberOfKeysPressed--;
                if (numberOfKeysPressed < 1) {
                    // masterGain.gain.value = 0;
                    masterGain.gain.cancelScheduledValues(actx.currentTime);
                    masterGain.gain.linearRampToValueAtTime(0, actx.currentTime);
                }
            }
        };

        masterGainControl.oninput = function (event) {
            currentGain = event.target.value;
            if (numberOfKeysPressed > 0) {
                masterGain.gain.value = currentGain;
            }
        };

        osc1WaveformRadios.forEach(function(waveformRadio) {
            waveformRadio.onclick = function(event) {
                osc1.type = event.target.value;
            }
        });
    };

    function run () {
        // init audio stuff
        initAudio();
        // setup listeners
        initListeners();
    };

    run();
})();
