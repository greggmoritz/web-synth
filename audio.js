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

    function resetSignalPath () {
        modGain.gain.value = 1;
        try { osc1.disconnect(filter); } catch (e) {};
        try { osc1.disconnect(modGain); } catch (e) {};
        try { osc1.disconnect(panner); } catch (e) {};
        try { lfo.disconnect(modGain); } catch (e) {};
        try { lfo.disconnect(modGain.gain); } catch (e) {};
        try { lfo.disconnect(panner.pan); } catch (e) {};
        try { modGain.disconnect(osc1.frequency); } catch (e) {};
        try { modGain.disconnect(filter); } catch (e) {};
        try { panner.disconnect(filter); } catch (e) {};
    };

    function wireFreqMod () {
        resetSignalPath();

        osc1.connect(filter);
        lfo.connect(modGain);
        modGain.connect(osc1.frequency);
    };

    function wireAmpMod () {
        resetSignalPath();
        // insert a modulation gain in the signal chain
        lfo.connect(modGain.gain);
        osc1.connect(modGain);
        modGain.connect(filter);
    };

    function wirePanMod () {
        resetSignalPath();
        // insert panner in the signal chain
        lfo.connect(modGain);
        modGain.connect(panner.pan);
        osc1.connect(panner);
        panner.connect(filter);
    };

    function wireFilterMod () {
        resetSignalPath();
        // LFO controls filter cutoff
        modGain.gain.value = 400;
        lfo.connect(modGain);
        modGain.connect(filter.frequency);
        osc1.connect(filter);
    };

    function wireFilterCutoffMod () {
        resetSignalPath();
        // LFO controls filter cutoff
        modGain.gain.value = 400;
        lfo.connect(modGain);
        modGain.connect(filter.frequency);
        osc1.connect(filter);
    };

    function wireFilterResonanceMod () {
        resetSignalPath();
        // LFO controls filter cutoff
        modGain.gain.value = 50;
        lfo.connect(modGain);
        modGain.connect(filter.Q);
        osc1.connect(filter);
    };

    function initAudio () {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        analyzer = actx.createAnalyser();
        panner = window.panner = actx.createStereoPanner();
        initAnalyzer(analyzer);
        osc1 = window.osc1 = actx.createOscillator();
        lfo = window.lfo = actx.createOscillator();
        modGain = window.modGain = actx.createGain();
        masterGain = window.masterGain = actx.createGain();
        masterGain.gain.value = 0;

        // init LFO
        lfo.frequency.value = 0; // 2Hz

        // filter playground
        var filter = window.filter = actx.createBiquadFilter();
        filter.type = "lowpass";
        // filter.gain.value
        // filter.Q.value

        //
        // wire up signal path
        //
        lfo.connect(filter.frequency);
        osc1.connect(filter);
        filter.connect(masterGain);
        masterGain.connect(panner);
        panner.connect(analyzer);
        analyzer.connect(actx.destination);
        // initiate sound
        osc1.start();

        //
        // Default LFO
        // Tremolo - Volume Modulation
        //
        wireAmpMod();
        lfo.start();
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
        var lfoFreqControl = document.getElementById("lfo-freq");
        var lfoWaveformRadios = document.querySelectorAll("[name='lfo-waveform']");
        var lfoParamRadios = document.querySelectorAll("[name='lfo-param']");
        var filt1Cutoff = document.getElementById("filter1-cutoff");
        var filter1TypeRadios = document.querySelectorAll("[name='filter1-type']");

        // On keypress
        // H
        document.onkeypress = function (event) {
            if (event.repeat) {
                return;
            }
            var key = event.key;
            if (Object.keys(keysToNotes).includes(key)) {
                numberOfKeysPressed++;
                var noteName = keysToNotes[key];
                masterGain.gain.value = currentGain;
                osc1.frequency.value = notesToHz[noteName];
            }
        };
        document.onkeyup = function (event) {
            var key = event.key;
            if (Object.keys(keysToNotes).includes(key)) {
                numberOfKeysPressed--;
                if (numberOfKeysPressed < 1) {
                    masterGain.gain.value = 0;
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

        lfoFreqControl.oninput = function (event) {
            lfo.frequency.value = event.target.value;
        };

        lfoWaveformRadios.forEach(function(waveformRadio) {
            waveformRadio.onclick = function(event) {
                lfo.type = event.target.value;
            }
        });

        lfoParamRadios.forEach(function(paramRadio) {
            paramRadio.onclick = function(event) {
                var value = event.target.value;
                switch (value) {
                    case "volume":
                        wireAmpMod();
                        break;
                    case "pitch":
                        wireFreqMod();
                        modGain.gain.value = 20;
                        break;
                    // case "pan":
                    //     wirePanMod();
                    //     break;
                    case "cutoff":
                        wireFilterCutoffMod();
                        break;
                    case "resonance":
                        wireFilterResonanceMod();
                        break;
                    default:

                }
            }
        });

        filt1Cutoff.oninput = function (event) {
            filter.frequency.value = event.target.value;
        };

        filter1TypeRadios.forEach(function(filterType) {
            filterType.onclick = function(event) {
                filter.type = event.target.value;
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
