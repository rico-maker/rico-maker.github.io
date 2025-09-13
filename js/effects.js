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
var analyser1, analyser2;
var analyserView1, analyserView2;
var constraints = { audio: { optional: [{ echoCancellation: false }] } };

// ---------------- FUNÇÕES EXISTENTES ----------------
// Mantém todas as funções do seu código original, como:
// convertToMono, gotStream, changeEffect, createDelay, createReverb, createAutowah, etc.
// ---------------------------------------------------

// ---------- NOVA PARTE: Controle do Wah via Gamepad ----------
var gamepadIndex = null;

window.addEventListener("gamepadconnected", function(e) {
    console.log("Gamepad conectado: " + e.gamepad.id);
    gamepadIndex = e.gamepad.index;
});

window.addEventListener("gamepaddisconnected", function(e) {
    console.log("Gamepad desconectado: " + e.gamepad.id);
    if(gamepadIndex === e.gamepad.index) gamepadIndex = null;
});

function updateWahFromGamepad() {
    if(gamepadIndex !== null && awFilter && awDepth) {
        var gp = navigator.getGamepads()[gamepadIndex];
        if(gp) {
            var r2 = gp.buttons[8].value; // botão R2
            var minFreq = 50;   // frequência mínima do wah
            var maxFreq = 2000; // frequência máxima do wah
            awFilter.frequency.value = minFreq + r2 * (maxFreq - minFreq);
        }
    }
    requestAnimationFrame(updateWahFromGamepad);
}

requestAnimationFrame(updateWahFromGamepad);

// ---------- FINALIZAÇÃO: inicialização ----------
window.addEventListener('load', initAudio );
window.addEventListener('keydown', keyPress );
