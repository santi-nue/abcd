const editor = ace.edit("editor");
const synth = new Tone.Synth().toDestination();
const abcjs = window.ABCJS;
/**
 * reload the content from local storage
 */

let storedValue = load();
if (storedValue == undefined)
    storedValue = getId() + "\nMozart\n\n𝄞  ♯♯  3/4 a/ a/ (3 b♭ b♭ b♭ f#- | f#2  \n😀 Li fe is beau ti ful,      |  yes \n𝄞  ♯♯  3/4  r [c e♭']3 | d r  \n𝄢           A,4 |  ";

let lines = storedValue.split("\n");
lines[0] = getId();
storedValue = lines.join("\n");
editor.setValue(storedValue, -1);//-1 means cursor at the beginning


setInterval(() => save(editor.getValue()), 5000);

/**
 * we store whether there is (was) a selection
 */
let isSelection = false;
setInterval(() => { isSelection = (editor.getSelectedText() != "") }, 200);


/**
 * 
 * @param {*} event 
 * @description close the insert menu
 */


window.onclick = (event) => {
    if (!event.target.matches('#buttonInsert')) {
        toolbarInsert.classList.remove("show");
    }
}

function update() {
    const abcd = editor.getValue();
    setId(abcd.split("\n")[0].trim());
    const abc = abcd2abc(abcd);
    /*abcjs.renderAbc("output", abc);
    abcjs.renderMidi("midiPlayer", abc, {}, { generateInline: true }, {});*/
    const visualObj = abcjs.renderAbc('output', abc, {
        oneSvgPerLine: true
    })[0];
    const synthControl = new abcjs.synth.SynthController();
    synthControl.load("#audio", null, { displayRestart: true, displayPlay: true, displayProgress: true });
    synthControl.setTune(visualObj, false);
}
editor.getSession().on('change', update);

update();
/**
 * @description executed after the user types sth
 */
editor.commands.on('afterExec', eventData => {
    if (eventData.command.name === 'insertstring') {
        if (isSelection)
            return;
        const currline = editor.getSelectionRange().start.row;
        const wholelinetxt = editor.session.getLine(currline);
        if (!wholelinetxt.startsWith("😀"))
            if (['a', 'b', 'c', 'd', 'e', 'f', 'g'].indexOf(eventData.args) >= 0) {
                let h = 3;
                if (inputOctave.value.length > 0)
                    h += inputOctave.value.length * (inputOctave.value[0] == "'" ? 1 : -1);

                const realPitch = accidentalize(lyToPitch(eventData.args), currentKey());

                const noteName = realPitch.toStringTone() + h;
                synth.triggerAttackRelease(noteName, "32n");
                editor.session.insert(editor.getCursorPosition(), inputOctave.value + " ");
            }
    }
});


/**
 * clean the code, align the symbols |
 */
function clean() {
    const code = editor.getValue();

    function alignLines(lines, ibegin, iend) {
        console.log(ibegin, iend)
        const splits = [];
        const measureLength = [];

        for (let i = ibegin; i <= iend; i++) {
            splits[i] = lines[i].split("|").map((s) => s.trim());

            for (let j = 0; j < splits[i].length; j++) {
                if (j > measureLength.length - 1)
                    measureLength.push(1);
                measureLength[j] = Math.max(measureLength[j], splits[i][j].length);
            }
        }

        for (let i = ibegin; i <= iend; i++) {
            for (let j = 0; j < splits[i].length; j++) {
                splits[i][j] = splits[i][j].padEnd(measureLength[j], " ");
            }
            lines[i] = splits[i].join(" | ");
        }
    }

    function reorganiseLines(lines) {
        let ibegin = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line == "|" || line == "||") {
                iend = i - 1;
                alignLines(lines, ibegin, iend);
                ibegin = i + 1;
            }
        }
        alignLines(lines, ibegin, lines.length - 1);
        return lines;
    }
    const lines = code.split("\n");
    editor.setValue([lines[0], lines[1], ...reorganiseLines(lines.slice(2))].join("\n"), -1);
}

buttonClean.onclick = clean;



/**
 * 
 * @param {*} text 
 * @param {*} event
 * @description add a button in the list of buttons 
 */
function addButton(text, hint, event) {
    const b = document.createElement("button");
    b.innerHTML = text;
    b.title = hint;
    b.onclick = event;
    toolbarInsert.append(b);
}

function buttonInsert(s, hint) {
    console.log("add button " + s)
    addButton(s, hint, () => {
        editorInsert(s)
        editor.focus();
    });
}




/**
 * 
 * @param {*} f
 * @description replace the selection by f(selection) 
 */
function editorReplaceSelection(f) {
    const r = editor.selection.getRange();

    const end = editor.session.replace(r, f(editor.getSelectedText()));
    editor.selection.setRange({
        start: r.start, end: end
    });
}


function editorInsert(str) {
    const r = editor.selection.getRange();
    editor.session.replace(r, str);
}

function action8upOrDown(f) {
    if (editor.getSelectedText() == "") {
        inputOctave.value = f("a" + inputOctave.value).substr(1);
    }
    else
        editorReplaceSelection(f);
}

button8up.onclick = () => action8upOrDown(str8up);
button8down.onclick = () => action8upOrDown(str8down);

buttonInsert("𝄞 ", "add a treble key");
buttonInsert("𝄢 ", "add a treble key");
buttonInsert("♭", "add flat");
//buttonInsert("♮", "add normal");
buttonInsert("♯", "add sharp");
buttonInsert("😀 ", "add lyrics");
buttonInsert("♩=120 ", "add tempo indication");


addButton("chord", "write/transform into chord", () => {
    if (editor.getSelectedText() != "")
        editorReplaceSelection((selection) => "[" + selection + "]");
    else {
        let pos = editor.getCursorPosition();
        editor.session.insert(pos, "[]");
        editor.gotoLine(pos.row + 1, pos.column + 1);
    }
    editor.focus();
})


/*editor.getSession().on('change', function () {
    abcd2Vexflow(editor.getValue());
});*/



function currentKey() {
    function findKey() {
        const code = editor.getValue();

        function accidentalsSurroundedBySpace(accident, n) { return " " + accident.repeat(n) + " "; }

        for (const sharp of ["#", "♯", "♭", "b"]) {
            for (let i = 7; i > 0; i--) {
                if (code.indexOf(accidentalsSurroundedBySpace(sharp, i)) >= 0)
                    return i * (((sharp == "#") || sharp == "♯") ? 1 : -1);
            }
        }
        return 0;
    }

    const accidentals = findKey();

    return lyToPitch(["c♭", "g♭", "d♭", "a♭", "e♭", "b♭", "f", "c", "g", "d", "a", "e", "b", "f#", "c#"][7 + accidentals]);
}



