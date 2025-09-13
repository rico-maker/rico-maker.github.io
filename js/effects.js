var audioContext = new AudioContext;
var audioInput = null,
    realAudioInput = null,
    effectInput = null,
    wetGain = null,
    dryGain = null,
    outputMix = null,
    currentEffectNode = null,
    reverbBuffer = null,
    dtime = null,
    dregen = null,
    lfo = null,
    cspeed = null,
    cdelay = null,
    cdepth = null,
    scspeed = null,
    scldelay = null,
    scrdelay = null,
    scldepth = null,
    scrdepth = null,
    fldelay = null,
    flspeed = null,
    fldepth = null,
    flfb = null,
    sflldelay = null,
    sflrdelay = null,
    sflspeed = null,
    sflldepth = null,
    sflrdepth = null,
    sfllfb = null,
    sflrfb = null,
    rmod = null,
    mddelay = null,
    mddepth = null,
    mdspeed = null,
    lplfo = null,
    lplfodepth = null,
    lplfofilter = null,
    awFollower = null,
    awDepth = null,
    awFilter = null,
    ngFollower = null,
    ngGate = null,
    bitCrusher = null,
    btcrBits = 16,   
    btcrNormFreq = 1; 

var rafID = null;
var analyser1;
var analyserView1;
var constraints = 
{
  audio: {
      optional: [{ echoCancellation: false }]
  }
};

function convertToMono( input ) {
    var splitter = audioContext.createChannelSplitter(2);
    var merger = audioContext.createChannelMerger(2);

    input.connect( splitter );
    splitter.connect( merger, 0, 0 );
    splitter.connect( merger, 0, 1 );
    return merger;
}

window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame;
window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame;

function cancelAnalyserUpdates() {
    if (rafID)
        window.cancelAnimationFrame( rafID );
    rafID = null;
}

function updateAnalysers(time) {
    analyserView1.doFrequencyAnalysis( analyser1 );
    analyserView2.doFrequencyAnalysis( analyser2 );
    
    rafID = window.requestAnimationFrame( updateAnalysers );
}

var lpInputFilter=null;
function createLPInputFilter() {
    lpInputFilter = audioContext.createBiquadFilter();
    lpInputFilter.frequency.value = 2048;
    return lpInputFilter;
}

function toggleMono() {
    if (audioInput != realAudioInput) {
        audioInput.disconnect();
        realAudioInput.disconnect();
        audioInput = realAudioInput;
    } else {
        realAudioInput.disconnect();
        audioInput = convertToMono( realAudioInput );
    }

    createLPInputFilter();
    lpInputFilter.connect(dryGain);
    lpInputFilter.connect(analyser1);
    lpInputFilter.connect(effectInput);
}

var useFeedbackReduction = true;

function gotStream(stream) {
    var input = audioContext.createMediaStreamSource(stream);
    audioInput = convertToMono( input );

    if (useFeedbackReduction) {
        audioInput.connect( createLPInputFilter() );
        audioInput = lpInputFilter;        
    }

    outputMix = audioContext.createGain();
    dryGain = audioContext.createGain();
    wetGain = audioContext.createGain();
    effectInput = audioContext.createGain();
    audioInput.connect(dryGain);
    audioInput.connect(analyser1);
    audioInput.connect(effectInput);
    dryGain.connect(outputMix);
    wetGain.connect(outputMix);
    outputMix.connect( audioContext.destination);
    outputMix.connect(analyser2);
    crossfade(1.0);
    changeEffect();
    cancelAnalyserUpdates();
    updateAnalysers();
}

function changeInput(){
  if (!!window.stream) {
    window.stream.stop();
  }
  var audioSelect = document.getElementById("audioinput");
  var audioSource = audioSelect.value;
  constraints.audio.optional.push({sourceId: audioSource});

  navigator.getUserMedia(constraints, gotStream, function(e) {
            alert('Error getting audio');
            console.log(e);
        });
}

function gotSources(sourceInfos) {
    var audioSelect = document.getElementById("audioinput");
    while (audioSelect.firstChild)
        audioSelect.removeChild(audioSelect.firstChild);

    for (var i = 0; i != sourceInfos.length; ++i) {
        var sourceInfo = sourceInfos[i];
        if (sourceInfo.kind === 'audioinput') {
            var option = document.createElement("option");
            option.value = sourceInfo.id;
            option.text = sourceInfo.label || 'input ' + (audioSelect.length + 1);
            audioSelect.appendChild(option);
        }
    }
    audioSelect.onchange = changeInput;
}

function initAudio() {
    var irRRequest = new XMLHttpRequest();
    irRRequest.open("GET", "sounds/cardiod-rear-levelled.wav", true);
    irRRequest.responseType = "arraybuffer";
    irRRequest.onload = function() {
        audioContext.decodeAudioData( irRRequest.response, 
            function(buffer) { reverbBuffer = buffer; } );
    }
    irRRequest.send();

    o3djs.require('o3djs.shader');

    analyser1 = audioContext.createAnalyser();
    analyser1.fftSize = 1024;
    analyser2 = audioContext.createAnalyser();
    analyser2.fftSize = 1024;

    analyserView1 = new AnalyserView("view1");
    analyserView1.initByteBuffer( analyser1 );
    analyserView2 = new AnalyserView("view2");
    analyserView2.initByteBuffer( analyser2 );

    if (!navigator.getUserMedia)
        return(alert("Error: getUserMedia not supported!"));

    navigator.getUserMedia(constraints, gotStream, function(e) {
            alert('Error getting audio');
            console.log(e);
        });

    navigator.mediaDevices.enumerateDevices().then(gotSources);
    document.getElementById("effect").onchange=changeEffect;
}

function keyPress(ev) {
    var oldEffect = document.getElementById("effect").selectedIndex;
    var newEffect = oldEffect;
    switch (ev.keyCode) {
      case 50: // 'r'
        newEffect = 1;
        break;
      case 49: // 'c'
        newEffect = 8;
        break;
      case 51: // 'p'
        newEffect = 10;
        break;
      default:
        console.log(ev.keyCode);
    }
    if (newEffect != oldEffect) {
        document.getElementById("effect").selectedIndex = newEffect;
        changeEffect();
    }
}

window.addEventListener('load', initAudio );
window.addEventListener('keydown', keyPress );

function crossfade(value) {
  var gain1 = Math.cos(value * 0.5*Math.PI);
  var gain2 = Math.cos((1.0-value) * 0.5*Math.PI);

  dryGain.gain.value = gain1;
  wetGain.gain.value = gain2;
}

var lastEffect = -1;

function changeEffect() {
    lfo = null;
    dtime = null;
    dregen = null;
    cspeed = null;
    cdelay = null;
    cdepth = null;
    rmod = null;
    fldelay = null;
    flspeed = null;
    fldepth = null;
    flfb = null;
    scspeed = null;
    scldelay = null;
    scrdelay = null;
    scldepth = null;
    scrdepth = null;
    sflldelay = null;
    sflrdelay = null;
    sflspeed = null;
    sflldepth = null;
    sflrdepth = null;
    sfllfb = null;
    sflrfb = null;
    rmod = null;
    mddelay = null;
    mddepth = null;
    mdspeed = null;
    lplfo = null;
    lplfodepth = null;
    lplfofilter = null;
    awFollower = null;
    awDepth = null;
    awFilter = null;
    ngFollower = null;
    ngGate = null;
    bitCrusher = null;

    if (currentEffectNode) 
        currentEffectNode.disconnect();
    if (effectInput)
        effectInput.disconnect();

    var effect = document.getElementById("effect").selectedIndex;
    var effectControls = document.getElementById("controls");
    if (lastEffect > -1)
        effectControls.children[lastEffect].classList.remove("display");
    lastEffect = effect;
    effectControls.children[effect].classList.add("display");

    switch (effect) {
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
        case 12:
            var pingPong = createPingPongDelay(audioContext, (audioInput == realAudioInput), 0.3, 0.4 );
            pingPong.output.connect( wetGain );
            currentEffectNode = pingPong.input;
            break;
        case 13: currentEffectNode = createFilterLFO(); break;
        case 14: currentEffectNode = createEnvelopeFollower(); break;
        case 15: currentEffectNode = createAutowah(); break;
        case 16: currentEffectNode = createNoiseGate(); break;
        case 17:
            var pingPong = createPingPongDelay(audioContext, (audioInput == realAudioInput), 0.5, 0.5 );
            pingPong.output.connect( wetGain );
            pingPong.input.connect(wetGain);
            var tempWetGain = wetGain;
            wetGain = pingPong.input;
            wetGain = createAutowah();
            currentEffectNode = createPitchShifter();
            wetGain = tempWetGain;
            break;
        case 18:
            var tempWetGain = wetGain;
            wetGain = createStereoChorus();
            wetGain = createDistortion();
            currentEffectNode = createAutowah();
            wetGain = tempWetGain;
            waveshaper.setDrive(20);
            break;
        case 19: currentEffectNode = createVibrato(); break;
        case 20: currentEffectNode = createBitCrusher(); break;
        case 21: currentEffectNode = createApolloEffect(); break;
        default: break;
    }
    audioInput.connect( currentEffectNode );
}

// --- Gamepad Wahwah Integration ---
function pollGamepad() {
    const gamepads = navigator.getGamepads();
    if (!gamepads) return;

    const gp = gamepads[0]; 
    if (!gp) return;

    let r2 = gp.axes[5]; 
    if (r2 === undefined) r2 = 1; 

    const normalized = (r2 + 1) / 2;

    if (awFilter) {
        awFilter.frequency.value = 500 + normalized * 5000;
    }

    requestAnimationFrame(pollGamepad);
}

window.addEventListener("gamepadconnected", function(e) {
    console.log("Gamepad connected:", e.gamepad);
    pollGamepad();
});

window.addEventListener("gamepaddisconnected", function(e) {
    console.log("Gamepad disconnected:", e.gamepad);
});
