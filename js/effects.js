var audioContext = new AudioContext();
var audioInput = null,
    realAudioInput = null,
    effectInput = null,
    wetGain = null,
    dryGain = null,
    outputMix = null,
    currentEffectNode = null,
    reverbBuffer = null,
    lpInputFilter = null,
    rafID = null,
    analyser1, analyser2,
    analyserView1, analyserView2;

var gamepadIndex = null;
var r2Node = null;

// ====== Funções auxiliares ======
function convertToMono(input) {
    var splitter = audioContext.createChannelSplitter(2);
    var merger = audioContext.createChannelMerger(2);
    input.connect(splitter);
    splitter.connect(merger, 0, 0);
    splitter.connect(merger, 0, 1);
    return merger;
}

function createLPInputFilter() {
    lpInputFilter = audioContext.createBiquadFilter();
    lpInputFilter.frequency.value = 2048;
    return lpInputFilter;
}

function toggleMono() {
    if(!audioInput || !realAudioInput) return;
    if (audioInput != realAudioInput) {
        audioInput.disconnect();
        realAudioInput.disconnect();
        audioInput = realAudioInput;
    } else {
        realAudioInput.disconnect();
        audioInput = convertToMono(realAudioInput);
    }
    createLPInputFilter();
    lpInputFilter.connect(dryGain);
    lpInputFilter.connect(analyser1);
    lpInputFilter.connect(effectInput);
}

function cancelAnalyserUpdates() {
    if (rafID) window.cancelAnimationFrame(rafID);
    rafID = null;
}

function updateAnalysers(time) {
    analyserView1.doFrequencyAnalysis(analyser1);
    analyserView2.doFrequencyAnalysis(analyser2);
    rafID = window.requestAnimationFrame(updateAnalysers);
}

function crossfade(value) {
    var gain1 = Math.cos(value * 0.5 * Math.PI);
    var gain2 = Math.cos((1.0 - value) * 0.5 * Math.PI);
    dryGain.gain.value = gain1;
    wetGain.gain.value = gain2;
}

// ====== Gamepad R2 ======
window.addEventListener("gamepadconnected", (e) => { gamepadIndex = e.gamepad.index; });
window.addEventListener("gamepaddisconnected", (e) => { if (gamepadIndex === e.gamepad.index) gamepadIndex = null; });

// ====== Stream ======
function gotStream(stream) {
    var input = audioContext.createMediaStreamSource(stream);
    audioInput = convertToMono(input);

    // === Mix ===
    outputMix = audioContext.createGain();
    dryGain = audioContext.createGain();
    wetGain = audioContext.createGain();
    effectInput = audioContext.createGain();

    audioInput.connect(dryGain);
    audioInput.connect(analyser1);
    audioInput.connect(effectInput);
    dryGain.connect(outputMix);
    wetGain.connect(outputMix);
    outputMix.connect(audioContext.destination);
    outputMix.connect(analyser2);

    // === R2 multiplicador final ===
    r2Node = audioContext.createScriptProcessor(1024, 1, 1);
    effectInput.connect(r2Node);
    r2Node.connect(outputMix);
    r2Node.onaudioprocess = function(e) {
        let input = e.inputBuffer.getChannelData(0);
        let output = e.outputBuffer.getChannelData(0);
        let r2Value = 0;
        if (gamepadIndex !== null) {
            let gp = navigator.getGamepads()[gamepadIndex];
            if (gp) r2Value = gp.buttons[7].value;
        }
        let factor = 1 + r2Value;
        for (let i = 0; i < input.length; i++) output[i] = input[i] * factor;
    };

    crossfade(1.0);
    changeEffect();
    cancelAnalyserUpdates();
    updateAnalysers();
}

// ====== Inicialização ======
function initAudio() {
    analyser1 = audioContext.createAnalyser();
    analyser1.fftSize = 1024;
    analyser2 = audioContext.createAnalyser();
    analyser2.fftSize = 1024;

    analyserView1 = new AnalyserView("view1");
    analyserView1.initByteBuffer(analyser1);
    analyserView2 = new AnalyserView("view2");
    analyserView2.initByteBuffer(analyser2);

    if (!navigator.getUserMedia)
        return alert("Error: getUserMedia not supported!");

    navigator.getUserMedia({audio: {optional: [{ echoCancellation: false }]}}, gotStream, function(e){
        alert('Error getting audio'); console.log(e);
    });
}

// ====== Efeitos ======
var lastEffect = -1;
function changeEffect() {
    if (currentEffectNode) currentEffectNode.disconnect();
    if (effectInput) effectInput.disconnect();

    var effect = document.getElementById("effect").selectedIndex;
    var effectControls = document.getElementById("controls");
    if (lastEffect > -1) effectControls.children[lastEffect].classList.remove("display");
    lastEffect = effect;
    effectControls.children[effect].classList.add("display");

    // Conecta os efeitos
    switch(effect) {
        case 0: currentEffectNode = createDelay(); break;
        case 1: currentEffectNode = createReverb(); break;
        case 2: currentEffectNode = createDistortion(); break;
        case 3: currentEffectNode = createTelephonizer(); break;
        case 4: currentEffectNode = createGainLFO(); break;
        case 5: currentEffectNode = createChorus(); break;
        case 6: currentEffectNode = createFlange(); break;
        case 7: currentEffectNode = createRingmod(); break;
        case 8: currentEffectNode = createStereoChorus(); break;
        case 9: currentEffectNode = createStereoFlange(); break;
        case 10: currentEffectNode = createPitchShifter(); break;
        case 11: currentEffectNode = createModDelay(); break;
        case 12: currentEffectNode = createPingPongDelayNode(); break;
        case 13: currentEffectNode = createFilterLFO(); break;
        case 14: currentEffectNode = createEnvelopeFollower(); break;
        case 15: currentEffectNode = createAutowah(); break;
        case 16: currentEffectNode = createNoiseGate(); break;
        case 19: currentEffectNode = createVibrato(); break;
        case 20: currentEffectNode = createBitCrusher(); break;
        case 21: currentEffectNode = createApolloEffect(); break;
        default: currentEffectNode = audioContext.createGain(); break;
    }

    audioInput.connect(currentEffectNode);
    currentEffectNode.connect(effectInput);
}

// ====== Eventos ======
window.addEventListener('load', initAudio);
window.addEventListener('keydown', keyPress);

var btcrBits = 16;
var btcrNormFreq = 1.0;

// ------------------LOAD & KEYDOWN----------------//
// ------------------LOAD & KEYDOWN----------------//
// ------------------LOAD & KEYDOWN----------------//
// ------------------LOAD & KEYDOWN----------------//
// ------------------LOAD & KEYDOWN----------------//


function impulseResponse(duration, decay, reverse) {
    var sampleRate = audioContext.sampleRate;
    var length = sampleRate * duration;
    var impulse = audioContext.createBuffer(2, length, sampleRate);
    var impulseL = impulse.getChannelData(0);
    var impulseR = impulse.getChannelData(1);

    if (!decay) decay = 2.0;
    for (var i = 0; i < length; i++) {
        var n = reverse ? length - i : i;
        impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
        impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
    }
    return impulse;
}

function createTelephonizer() {
    var lpf1 = audioContext.createBiquadFilter();
    lpf1.type = "lowpass";
    lpf1.frequency.value = 2000.0;
    var lpf2 = audioContext.createBiquadFilter();
    lpf2.type = "lowpass";
    lpf2.frequency.value = 2000.0;
    var hpf1 = audioContext.createBiquadFilter();
    hpf1.type = "highpass";
    hpf1.frequency.value = 500.0;
    var hpf2 = audioContext.createBiquadFilter();
    hpf2.type = "highpass";
    hpf2.frequency.value = 500.0;

    lpf1.connect(lpf2);
    lpf2.connect(hpf1);
    hpf1.connect(hpf2);
    hpf2.connect(wetGain);

    return lpf1;
}

function createBitCrusher() {
    var bitCrusher = audioContext.createScriptProcessor(4096, 1, 1);
    var phaser = 0;
    var last = 0;

    bitCrusher.onaudioprocess = function(e) {
        var step = Math.pow(1/2, btcrBits);
        var input = e.inputBuffer.getChannelData(0);
        var output = e.outputBuffer.getChannelData(0);
        for (var i = 0; i < input.length; i++) {
            phaser += btcrNormFreq;
            if (phaser >= 1.0) {
                phaser -= 1.0;
                last = step * Math.floor(input[i] / step + 0.5);
            }
            output[i] = last;
        }
    };
    bitCrusher.connect(wetGain);
    return bitCrusher;
}

function setBitCrusherDepth(bits) {
    btcrBits = bits;
    var length = Math.pow(2, bits);
    var curve = new Float32Array(length);
    var lengthMinusOne = length - 1;
    for (var i = 0; i < length; i++)
        curve[i] = (2 * i / lengthMinusOne) - 1;
    if (bitCrusher) bitCrusher.curve = curve;
}

function createPitchShifter() {
    var effect = new Jungle(audioContext);
    effect.output.connect(wetGain);
    return effect.input;
}

function createEnvelopeFollower() {
    var waveshaper = audioContext.createWaveShaper();
    var lpf1 = audioContext.createBiquadFilter();
    lpf1.type = "lowpass";
    lpf1.frequency.value = 10.0;

    var curve = new Float32Array(65536);
    for (var i=-32768; i<32768; i++)
        curve[i+32768] = ((i>0)?i:-i)/32768;
    waveshaper.curve = curve;
    waveshaper.connect(lpf1);
    lpf1.connect(wetGain);
    return waveshaper;
}

function createAutowah() {
    var inputNode = audioContext.createGain();
    var waveshaper = audioContext.createWaveShaper();
    awFollower = audioContext.createBiquadFilter();
    awFollower.type = "lowpass";
    awFollower.frequency.value = 10.0;

    var curve = new Float32Array(65536);
    for (var i=-32768; i<32768; i++)
        curve[i+32768] = ((i>0)?i:-i)/32768;
    waveshaper.curve = curve;
    waveshaper.connect(awFollower);

    awDepth = audioContext.createGain();
    awDepth.gain.value = 11585;
    awFollower.connect(awDepth);

    awFilter = audioContext.createBiquadFilter();
    awFilter.type = "lowpass";
    awFilter.Q.value = 15;
    awFilter.frequency.value = 50;
    awDepth.connect(awFilter.frequency);
    awFilter.connect(wetGain);

    inputNode.connect(waveshaper);
    inputNode.connect(awFilter);
    return inputNode;
}

function createNoiseGate() {
    var inputNode = audioContext.createGain();
    var rectifier = audioContext.createWaveShaper();
    ngFollower = audioContext.createBiquadFilter();
    ngFollower.type = "lowpass";
    ngFollower.frequency.value = 10.0;

    var curve = new Float32Array(65536);
    for (var i=-32768; i<32768; i++)
        curve[i+32768] = ((i>0)?i:-i)/32768;
    rectifier.curve = curve;
    rectifier.connect(ngFollower);

    ngGate = audioContext.createWaveShaper();
    ngGate.curve = generateNoiseFloorCurve(parseFloat(document.getElementById("ngFloor").value));

    ngFollower.connect(ngGate);

    var gateGain = audioContext.createGain();
    gateGain.gain.value = 0.0;
    ngGate.connect(gateGain.gain);

    gateGain.connect(wetGain);

    inputNode.connect(rectifier);
    inputNode.connect(gateGain);
    return inputNode;
}

function generateNoiseFloorCurve(floor) {
    var curve = new Float32Array(65536);
    var mappedFloor = floor * 32768;
    for (var i = 0; i < 32768; i++) {
        var value = (i < mappedFloor) ? 0 : 1;
        curve[32768-i] = -value;
        curve[32768+i] = value;
    }
    curve[0] = curve[1];
    return curve;
}
