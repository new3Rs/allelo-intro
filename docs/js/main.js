/* exported GoPosition */
// (C) 2017 ICHIKAWA, Yuji (New 3 Rs)

const PASS = -1;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

/**
 * 相手のカラーを返す。
 * @param {Integer} color 
 * @returns {Integer}
 */
function opponentOf(color) {
    switch (color) {
        case BLACK:
            return WHITE;
        case WHITE:
            return BLACK;
        default:
            return EMPTY;
    }
}

/** 盤上を再帰的に処理するときに処理済みかチェックするためのヘルパークラス */
class Marker {
    constructor(size) {
        this.value = 0;
        this.marks = new Int32Array(size);
    }

    clear() {
        this.value += 1;
    }

    isMarked(point) {
        return this.marks[point] === this.value;
    }

    mark(point) {
        this.marks[point] = this.value;
    }
}

class GoPosition {
    constructor(width, height) {
        this.WIDTH = width;
        this.HEIGHT = height;
        this.LENGTH = this.WIDTH * this.HEIGHT;
        this.state = new Uint8Array(this.LENGTH);
        this.turn = BLACK;
        this.marker1 = new Marker(this.LENGTH);
        this.marker2 = new Marker(this.LENGTH);
        this.ko = null;
    }

    opponent() {
        return opponentOf(this.turn);
    }

    switchTurn() {
        this.turn = opponentOf(this.turn);
    }

    getState(point) {
        return this.state[point];
    }

    setState(point, color) {
        this.state[point] = color;
    }

    removeString(string) {
        for (const e of string.points) {
            this.setState(e, EMPTY);
        }
    }

    captureBy(point) {
        const opponent = this.opponent();
        const captives = [];
        for (const pt of this.adjacenciesAt(point)) {
            if (this.getState(pt) === opponent) {
                const string = this.stringAt(pt);
                if (string.liberties.length === 0) {
                    this.removeString(string);
                    captives.push.apply(captives, string.points);
                }
            }
        }
        return captives;
    }

    stringAt(point) {
        const color = this.getState(point);
        if (color === EMPTY) {
            return null;
        }
        const opponent = opponentOf(color);
        const string = new GoString();

        this.marker1.clear();
        this.marker2.clear();
        string.points.push(point);
        this.marker2.mark(point);
        for (let index = 0; index < string.points.length; index++) {
            const pt = string.points[index];
            if (!this.marker1.isMarked(pt)) {
                this.marker1.mark(pt);
                for (const a of this.adjacenciesAt(pt)) {
                    if (!this.marker1.isMarked(a)) {
                        const state = this.getState(a);
                        if (state === color) {
                            if (!this.marker2.isMarked(a)) {
                                string.points.push(a);
                                this.marker2.mark(a);
                            }
                        } else {
                            this.marker1.mark(a);
                            if (state === opponent) {
                                string.opponents.push(a);
                            } else {
                                string.liberties.push(a);
                            }
                        }
                    }
                }
            }
        }
        return string;
    }

    connectedEmptiesAt(point) {
        if (this.getState(point) !== EMPTY) {
            return null;
        }
        const empties = new GoConnectedEmpties();

        this.marker1.clear();
        this.marker2.clear();
        empties.points.push(point);
        this.marker2.mark(point);
        for (let index = 0; index < empties.points.length; index++) {
            const pt = empties.points[index];
            if (!this.marker1.isMarked(pt)) {
                this.marker1.mark(pt);
                for (const a of this.adjacenciesAt(pt)) {
                    if (!this.marker1.isMarked(a)) {
                        const state = this.getState(a);
                        if (state === EMPTY) {
                            if (!this.marker2.isMarked(a)) {
                                empties.points.push(a);
                                this.marker2.mark(a);
                            }
                        } else {
                            this.marker1.mark(a);
                            if (state === BLACK) {
                                empties.blacks.push(a);
                            } else {
                                empties.whites.push(a);
                            }
                        }
                    }
                }
            }
        }
        return empties;
    }

    play(point) {
        if (point === PASS) {
            this.switchTurn();
            return {
                turn: this.turn,
                point,
                ko: this.ko,
                captives: []
            };
        }
        if (point == this.ko || this.getState(point) !== EMPTY) { // 着手禁止
            return null;
        }
        this.setState(point, this.turn);
        const captives = this.captureBy(point);
        const string = this.stringAt(point);
        const liberties = string.liberties.length;
        if (liberties === 0) { // 着手禁止
            this.setState(point, EMPTY); // restore
            return null;
        }
        const ko = this.ko;
        if (captives.length === 1 && liberties === 1 && string.points.length === 1) {
            this.ko = string.liberties[0];
        } else {
            this.ko = null;
        }
        const turn = this.turn;
        this.switchTurn();
        return { turn, point, ko, captives, string };
    }

    undoPlay(move) {
        this.ko = move.ko;
        this.switchTurn();
        if (move.point === PASS) {
            return;
        }
        this.setState(move.point, EMPTY);
        const opponent = opponentOf(move.turn);
        for (const p of move.captives) {
            this.setState(p, opponent);
        }
    }

    isLegal(point) {
        const move = this.play(point);
        if (move) {
            this.undoPlay(move);
            return true;
        }
        return false;
    }

    xyToPoint(x, y) {
        return (x - 1) + (y - 1) * this.WIDTH;
    }

    pointToXy(point) {
        const y = Math.floor(point / this.WIDTH);
        const x = point - y * this.WIDTH;
        return [x + 1, y + 1];
    }

    adjacenciesAt(point) {
        const xy = this.pointToXy(point);
        const result = [];
        for (const e of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
            const x = xy[0] + e[0];
            const y = xy[1] + e[1];
            if (x >= 1 && x <= this.WIDTH && y >= 1 && y <= this.HEIGHT) {
                result.push(this.xyToPoint(x, y));
            }
        }
        return result;
    }

    diagonalsAt(point) {
        const xy = this.pointToXy(point);
        const result = [];
        for (const e of [[-1, -1], [-1, 1], [1, -1], [1, -1]]) {
            const x = xy[0] + e[0];
            const y = xy[1] + e[1];
            if (x >= 1 && x <= this.WIDTH && y >= 1 && y <= this.HEIGHT) {
                result.push(this.xyToPoint(x, y));
            }
        }
        return result;
    }

    canEscape(string) {
        if (string.liberties.length > 1) { // アタリじゃない
            return true;
        }
        for (const o of string.opponents) { // 相手の石を取って逃げる
            const os = this.stringAt(o);
            if (os.liberties.length == 1) { // アタリの石
                const escape = this.play(os.liberties[0]);
                if (!escape) { // 着手禁止
                    continue;
                }
                const ss = this.stringAt(string.points[0]); // stringの更新
                if (ss.liberties.length == 2) { // 取ってもまだシチョウ
                    for (const o of ss.liberties) {
                        const tryToCapture = this.play(o);
                        if (!tryToCapture) {
                            continue;
                        }
                        const result = this.canEscape(this.stringAt(ss.points[0]));
                        this.undoPlay(tryToCapture);
                        if (!result) {
                            this.undoPlay(escape);
                            return false;
                        }
                    }
                    this.undoPlay(escape);
                    return true;
                } else {
                    this.undoPlay(escape);
                    return ss.liberties.length > 2;
                }
            }
        }
        const escape = this.play(string.liberties[0]);
        if (!escape) {
            return false;
        }
        if (escape.string.liberties.length === 2) {
            for (const o of escape.string.liberties) {
                const tryToCapture = this.play(o);
                if (!tryToCapture) {
                    continue;
                }
                const ss = this.stringAt(string.points[0]);
                const result = this.canEscape(ss);
                this.undoPlay(tryToCapture);
                if (!result) {
                    this.undoPlay(escape);
                    return false;
                }
            }
            this.undoPlay(escape);
            return true;
        } else {
            this.undoPlay(escape);
            return escape.string.liberties.length !== 1;
        }
    }

    likeEye(point) {
        if (this.getState(point) !== EMPTY) {
            return false;
        }
        const adjacencies = this.adjacenciesAt(point);
        if (!adjacencies.every(p => this.getState(p) === this.turn)) {
            return false;
        }
        return adjacencies.every(p => this.stringAt(p).liberties.length > 1);
    }

    isEyeOfTurn(point, stack=[]) {
        if (!this.likeEye(point)) {
            return false;
        }
        let numBadDiagonal = 0;
        const allowableBadDiagonal = this.adjacenciesAt(point).length === 4 ? 1 : 0;

        const opponent = opponentOf(this.turn);
        for (const d of this.diagonalsAt(point)) {
            if (this.getState(d) === opponent) {
                numBadDiagonal += 1;
            } else if (this.getState(d) === EMPTY && stack.indexOf(d) < 0) {
                stack.push(point);
                if (!this.isEyeOfTurn(d, stack)) {
                    numBadDiagonal += 1;
                }
                stack.pop();
            }
            if (numBadDiagonal > allowableBadDiagonal) {
                return false;
            }
        }
        return true;
    }

    isFalseEye(point) {
        return this.likeEye(point) && !this.isEyeOfTurn(point);
    }

    toString() {
        let string ='';
        for (let y = 1; y <= this.HEIGHT; y++) {
            for (let x = 1; x <= this.WIDTH; x++) {
                switch (this.getState(this.xyToPoint(x, y))) {
                    case EMPTY:
                        string += '.';
                        break;
                    case BLACK:
                        string += 'X';
                        break;
                    case WHITE:
                        string += 'O';
                        break;
                    default:
                }
            }
            string += '\n';
        }
        return string;
    }
}

class GoString {
    constructor() {
        this.points = [];
        this.liberties = [];
        this.opponents = [];
    }
}

class GoConnectedEmpties {
    constructor() {
        this.points = [];
        this.blacks = [];
        this.whites = [];
    }
}

/**
 * 配列から要素を削除する。
 * @private
 * @param {Array} array 
 * @param {*} element 
 */
function removeElement(array, element) {
    const index = array.indexOf(element);
    if (index < 0) {
        return;
    }
    array.splice(index, 1);
}

/**
 * シェーダをマクロ展開しコンパイルする。
 * @private
 * @param {WebGLRenderingContext} gl 
 * @param {HTMLScriptElement} elem 
 * @param {Number} width 
 * @param {Number} height 
 * @param {Integer} boardWidth 
 * @param {Integer} boardHeight 
 * @returns {WebGLShader}
 */
function compileShader(gl, elem, width, height, boardWidth, boardHeight) {
    let shaderType;
    switch (elem.type) {
        case 'x-shader/x-vertex':
        shaderType = gl.VERTEX_SHADER;
        break;
        case 'x-shader/x-fragment':
        shaderType = gl.FRAGMENT_SHADER;
        break;
        default:
        return;
    }
    const shader = gl.createShader(shaderType);
    gl.shaderSource(shader, elem.text
        .replace(/%BOARD_WIDTH%/g, boardWidth)
        .replace(/%BOARD_HEIGHT%/g, boardHeight)
        .replace(/%WIDTH%/g, width)
        .replace(/%HEIGHT%/g, height));
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw "Shader compile failed with: " + gl.getShaderInfoLog(shader);
    }
    return shader;
}

/**
 * getAttribLocationメソッドのラッパー関数。エラーを例外にする。
 * @private
 * @param {WebGLRenderingContext} gl 
 * @param {WebGLProgram} program 
 * @param {DOMString} name 
 * @returns {GLint}
 */
function getAttribLocation(gl, program, name) {
    var attributeLocation = gl.getAttribLocation(program, name);
    if (attributeLocation === -1) {
        throw 'Can not find attribute ' + name + '.';
    }
    return attributeLocation;
}

/**
 * getUniformLocationメソッドのラッパー関数。エラーを例外にする。
 * @private
 * @param {WebGLRenderingContext} gl 
 * @param {WebGLProgram} program 
 * @param {DOMString} name 
 * @returns {GLint}
 */
function getUniformLocation(gl, program, name) {
    var uniformLocation = gl.getUniformLocation(program, name);
    if (uniformLocation === -1) {
        throw 'Can not find uniform ' + name + '.';
    }
    return uniformLocation;
}

/** allelo-boardのヘルパークラス */
class AlleloBoard {
    /**
     * @param {Number} stoneSize
     * @param {Integer} boardWidth 
     * @param {Integer} boardHeight 
     * @param {ShadowRoot} shadowRoot 
     */
    constructor(stoneSize, boardWidth, boardHeight, shadowRoot) {
        this.stoneSize = stoneSize;
        this.boardWidth = boardWidth;
        this.boardHeight = boardHeight;
        this.shadowRoot = shadowRoot;
        this.drawing = false;
        this.listeners = {};
        const goban = shadowRoot.querySelector('#goban');
        this.territory = shadowRoot.querySelector('#territory');
        this.stones = shadowRoot.querySelector('#stones');
        const width = parseInt(goban.getAttribute('width'));
        const height = parseInt(goban.getAttribute('height'));
        this.territory.setAttribute('width', width);
        this.territory.setAttribute('height', height);
        this.stones.width = width;
        this.stones.height = height;
        this.gl = this.stones.getContext('webgl');
        this.vertexShader = compileShader(this.gl, shadowRoot.getElementById('vs'), width, height, boardWidth, boardHeight);
        this.fragmentShader = compileShader(this.gl, shadowRoot.getElementById('fs'), width, height, boardWidth, boardHeight);
        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, this.vertexShader);
        this.gl.attachShader(this.program, this.fragmentShader);
        this.gl.linkProgram(this.program);
        this.gl.useProgram(this.program);
        const vertexData = new Float32Array([
            -1.0,  1.0, // top left
            -1.0, -1.0, // bottom left
             1.0,  1.0, // top right
             1.0, -1.0, // bottom right
        ]);
        const vertexDataBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexDataBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertexData, this.gl.STATIC_DRAW);
        const positionHandle = getAttribLocation(this.gl, this.program, 'position');
        this.gl.enableVertexAttribArray(positionHandle);
        this.gl.vertexAttribPointer(
            positionHandle,
            2, // position is a vec2
            this.gl.FLOAT, // each component is a float
            this.gl.FALSE, // don't normalize values
            2 * 4, // two 4 byte float components per vertex
            0 // offset into each span of vertex data
        );
        this.stonesHandle = getUniformLocation(this.gl, this.program, 'states');
        this.leaves = shadowRoot.getElementById('leaves');
        this.clickHandler = this.constructor.prototype.clickHandler.bind(this);
        this.stones.addEventListener('click', this.clickHandler, false);
    }

    destroy() {
        this.stones.removeEventListener('click', this.clickHandler, false);
        this.gl.deleteProgram(this.program);
        this.gl.deleteShader(this.fragmentShader);
        this.gl.deleteShader(this.vertexShader);
    }

    xyToPoint(x, y) {
        return (x - 1) + (y - 1) * this.boardWidth;
    }

    pointToXy(p) {
        const y = Math.floor(p / this.boardWidth);
        const x = p - y * this.boardWidth;
        return [x + 1, y + 1];
    }

    /*
     * indexは置いた直後の石の位置。アニメーションする
     */
    async drawStone(boardState, color, addIndex, removeIndices = []) {
        this.drawing = true;
        const INTERVAL = 500; // ms
        const gl = this.gl;
        const b = boardState.slice();
        if (removeIndices.includes(addIndex)) {
            for (const e of removeIndices) {
                b[e] = color;
            }
        } else {
            const opponentColor = -color;
            for (const e of removeIndices) {
                b[e] = opponentColor;
            }
        }
        if (addIndex != null) {
            await new Promise((res, rej) => {
                const start = Date.now();
                const grow = () => {
                    const dataToSendToGPU = new Float32Array(b.length);
                    const interval = Date.now() - start;
                    const addStone = this.stoneSize / 2 * Math.min(interval / INTERVAL, 1.0);
                    for (let i = 0; i < b.length; i++) {
                        dataToSendToGPU[i] = b[i] * (i === addIndex ? addStone : this.stoneSize / 2);
                    }
                    gl.uniform1fv(this.stonesHandle, dataToSendToGPU);
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                    if (interval <= INTERVAL) {
                        requestAnimationFrame(grow);
                    } else {
                        res();
                    }
                };
                grow();
            });
        } else {
            const dataToSendToGPU = new Float32Array(b.length);
            for (let i = 0; i < b.length; i++) {
                dataToSendToGPU[i] = b[i] * this.stoneSize / 2;
            }
            gl.uniform1fv(this.stonesHandle, dataToSendToGPU);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
        this.updateLeaves(boardState);
        this.updateTerritory(boardState);
        if (removeIndices.length > 0) {
            await new Promise((res, rej) => {
                const start = Date.now();
                const decline = () => {
                    // To send the data to the GPU, we first need to
                    // flatten our data into a single array.
                    const dataToSendToGPU = new Float32Array(b.length);
                    const interval = Date.now() - start;
                    const removedStone = this.stoneSize / 2 * Math.max((INTERVAL - interval) / INTERVAL, 0.0);
                    for (let i = 0; i < b.length; i++) {
                        dataToSendToGPU[i] = b[i] * (removeIndices.includes(i) ? removedStone : this.stoneSize / 2);
                    }
                    gl.uniform1fv(this.stonesHandle, dataToSendToGPU);
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                    if (interval <= INTERVAL) {
                        requestAnimationFrame(decline);
                    } else {
                        res();
                    }
                };
                decline();
            });
        }
        this.drawing = false;
    }

    updateLeaves(boardState) {
        for (let i = 0; i < this.boardWidth * this.boardHeight; i++) {
            const leaf = this.leaves.getElementById(`leaf-${i}`);
            if (boardState[i]) {
                leaf.removeAttribute('display');
                leaf.setAttribute('style', boardState[i] > 0.0 ? 'fill:#004d00;stroke:none' : 'fill:#00ff00;stroke:none');
            } else {
                leaf.setAttribute('display', 'none');
            }
        }
    }

    updateTerritory(boardState) {
        const position = new GoPosition(this.boardWidth, this.boardHeight);
        let stones = 0;
        for (let y = 1; y <= this.boardHeight; y++) {
            for (let x = 1; x <= this.boardWidth; x++) {
                switch (boardState[this.xyToPoint(x, y)]) {
                    case 1.0:
                    position.setState(position.xyToPoint(x, y), BLACK);
                    stones += 1;
                    break;
                    case -1.0:
                    position.setState(position.xyToPoint(x, y), WHITE);
                    stones += 1;
                    break;
                    default:
                    position.setState(position.xyToPoint(x, y), EMPTY);
                }
            }
        }
        if (stones <= 1) { // 石を1つ置いた時他のすべてが地と見るのが正しいが、ルールを知ろうとする際には混乱すると思うので表示を抑制する
            for (let i = 0; i < boardState.length; i++) {
                const territory = this.territory.getElementById(`territory-${i}`);
                territory.setAttribute('display', 'none');
            }
            return;
        }

        const emptiesArray = [];
        for (let i = 0; i < boardState.length; i++) {
            const [x, y] = this.pointToXy(i);
            const j = position.xyToPoint(x, y);
            const territory = this.territory.getElementById(`territory-${i}`);
            if (position.getState(j) !== EMPTY) {
                territory.setAttribute('display', 'none');
                continue;
            }
            let empties = emptiesArray.find(e => e.points.includes(j));
            if (empties == null) {
                empties = position.connectedEmptiesAt(j);
                emptiesArray.push(empties);
            }
            if (empties.blacks.length > 0 && empties.whites.length === 0) {
                territory.removeAttribute('display');
                territory.setAttribute('style', 'fill:#004d00;stroke:#004d00');
            } else if (empties.blacks.length === 0 && empties.whites.length > 0) {
                territory.removeAttribute('display');
                territory.setAttribute('style', 'fill:#00ff00;stroke:#00ff00');
            } else {
                territory.setAttribute('display', 'none');
            }
        }
    }

    addEventListener(type, handler) {
        if (!this.listeners[type]) {
            this.listeners[type] = [];
        }
        this.listeners[type].push(handler);
    }

    removeEventListener(type, handler) {
        if (!this.listeners[type]) {
            return;
        }
        if (handler) {
            removeElement(this.listeners[type], handler);
        } else {
            this.listeners[type] = [];
        }
    }

    clickHandler(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        const stones = this.shadowRoot.querySelector('#stones');
        const x = Math.floor(this.boardWidth * (event.clientX - rect.left) / stones.offsetWidth) + 1;
        const y = Math.floor(this.boardHeight * (event.clientY - rect.top) / stones.offsetHeight) + 1;
        if (this.listeners.click) {
            for (const e of this.listeners.click) {
                e(x, y);
            }
        }
    }
}

class AlleloBoardElement extends HTMLElement {
    static init() {
        this.prototype.template = document.createElement('template');
        this.prototype.template.id = 'allelo-board';
        this.prototype.template.innerHTML = `
<style>
    :host {
        display: inline-block;  /* or display: block; */
    }
    .container {
        position: relative;
    }
    canvas {
        display: block; /* デフォルトのinlineのままだとcanvasの下に隙間が入る */
    }
    #goban {
        position: relative;
        background-image: url(data:image/png;base64,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);
        background-color: rgb(196, 127, 51);
    }
    #territory, #leaves, #stones {
        position: absolute;
        top: 0px;
    }
</style>
<div class="container">
    <canvas id="goban"></canvas>
    <svg id="territory" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <defs>
            <path id="two-leaves" d="M196.036,292.977c-16.781-18.297,21.344-105.25-166.266-192.188c-33.563,6.094-79.328,160.156,118.984,212.031
    		c65.594,21.344,57.969,94.563,57.969,122.016h38.125c0,0-15.594-87.094,54.078-119.016
    		c47.406-21.688,178.328-28.656,213.078-224.281c-66.234-38.313-281.625-7.75-276.266,186.313
	    	c-3.141,27.297-4.703,50.422-19.875,44.109C197.567,314.336,196.036,292.977,196.036,292.977z" opacity="0.5" />
        </defs>
        <defs>
            <g id="seedlings">
                <use xlink:href="#two-leaves" transform="translate(-80,-80) scale(0.07,0.07)"></use>
                <use xlink:href="#two-leaves" transform="translate(-15,-80) scale(0.07,0.07)"></use>
                <use xlink:href="#two-leaves" transform="translate(55,-80) scale(0.07,0.07)"></use>
                <use xlink:href="#two-leaves" transform="translate(120,-80) scale(0.07,0.07)"></use>
                <use xlink:href="#two-leaves" transform="translate(-60,-15) scale(0.07,0.07)"></use>
                <use xlink:href="#two-leaves" transform="translate(15,-15) scale(0.07,0.07)"></use>
                <use xlink:href="#two-leaves" transform="translate(75,-15) scale(0.07,0.07)"></use>
                <use xlink:href="#two-leaves" transform="translate(140,-15) scale(0.07,0.07)"></use>
                <use xlink:href="#two-leaves" transform="translate(-80,55) scale(0.07,0.07)"></use>
                <use xlink:href="#two-leaves" transform="translate(-15,55) scale(0.07,0.07)"></use>
                <use xlink:href="#two-leaves" transform="translate(55,55) scale(0.07,0.07)"></use>
                <use xlink:href="#two-leaves" transform="translate(120,55) scale(0.07,0.07)"></use>
                <use xlink:href="#two-leaves" transform="translate(-60,120) scale(0.07,0.07)"></use>
                <use xlink:href="#two-leaves" transform="translate(15,120) scale(0.07,0.07)"></use>
                <use xlink:href="#two-leaves" transform="translate(75,120) scale(0.07,0.07)"></use>
                <use xlink:href="#two-leaves" transform="translate(140,120) scale(0.07,0.07)"></use>
            </g>
        </defs>
    </svg>
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" id="leaves">
        <defs>
            <path
            id="leaf"
            d="m 0,-145 c -5.36199,-1.5478604 -14.21002,-8.6465004 -15.2827,-22.05113 -1.07198,-13.40533 13.94132,-32.17336 16.35468,-37.80264 2.41335,-5.63069 5.89798,0.53528 10.72469,5.36199 4.826,4.82601 31.099959,32.70794 -3.21876,54.1573096 -2.1991,1.3477504 -2.12414,2.5074104 -1.84201,5.7565604 0.4773,5.48079 1.34068,4.67681 0.86479,5.39169 -0.94116,1.41068 -4.76802,1.98344 -4.7666,0.4773 -0.001,-8.58004 -3.771,-25.1482604 -0.50983,-37.92426 4.29002,-16.80157 1.5521,-19.18452 1.5521,-19.18452 0,0 -1.6617,10.93895 -3.51856,18.29286 -4.46821,17.69534958 -0.3578,27.52484 -0.3578,27.52484 z"/>
        </defs>
        <defs>
            <g id="four-leaves">
                <use
                xlink:href="#leaf"
                transform="rotate(0)" 
                />
                <use
                xlink:href="#leaf"
                transform="rotate(90)" 
                />
                <use
                xlink:href="#leaf"
                transform="rotate(180)" 
                />
                <use
                xlink:href="#leaf"
                transform="rotate(270)" 
                />
            </g>
        </defs>
    </svg>
    <canvas id="stones"></canvas>
</div>
<script id="vs" type="x-shader/x-vertex">
    attribute vec2 position;

    void main() {
        // position specifies only x and y.
        // We set z to be 0.0, and w to be 1.0
        gl_Position = vec4(position, 0.0, 1.0);
    }
</script>
<script id="fs" type="x-shader/x-fragment">
    precision lowp float;
    const int BOARD_WIDTH = %BOARD_WIDTH%;
    const int BOARD_HEIGHT = %BOARD_HEIGHT%;
    const float WIDTH = %WIDTH%.0;
    const float HEIGHT = %HEIGHT%.0;
    uniform float states[BOARD_WIDTH * BOARD_HEIGHT];
    
    void main() {
        float _width = WIDTH / float(BOARD_WIDTH) / 2.0;
        float _height = HEIGHT / float(BOARD_HEIGHT) / 2.0;
        float x = gl_FragCoord.x;
        float y = gl_FragCoord.y;
        float b = 0.0;
        float w = 0.0;
        for (int j = 0; j < BOARD_HEIGHT; j++) {
            for (int i = 0; i < BOARD_WIDTH; i++) {
                float r = states[i + j * BOARD_WIDTH];
                float dx = _width + float(i) * 2.0 * _width - x;
                float dy = _height + float(j) * 2.0 * _height - (HEIGHT - y);
                float ratio = r*r/(dx*dx + dy*dy);
                ratio = ratio * ratio;
                ratio = ratio * ratio;
                ratio = ratio * ratio;
                if (r > 0.0) {
                    b += ratio;
                } else {
                    w += ratio;
                }
            }
        }
        float alpha = float(b > 1.0 || w > 1.0);
        float white = float(w > 1.0);
        gl_FragColor = vec4(0.0, white + 0.3, 0.0, alpha);
    }
</script>
`;
        customElements.define('allelo-board', this);
    }

    constructor() {
        super();
        let shadowRoot = this.attachShadow({mode: 'open'});
        const instance = this.template.content.cloneNode(true);
        shadowRoot.appendChild(instance);
        if (this.dataset.stoneSize != null && this.dataset.width != null && this.dataset.height != null) {
            this.initialize(
                parseFloat(this.dataset.stoneSize),
                parseInt(this.dataset.width),
                parseInt(this.dataset.height)
            );
        }
    }

    static get observedAttributes() {
        return [
            'data-stone-size',
            'data-width',
            'data-height'
        ];
    }

    connectedCallback() {
        console.log('connectedCallback');
    }

    disconnectedCallback() {
        console.log('disconnectedCallback');
    }

    adoptedCallback() {
        console.log('adoptedCallback');
    }

    attributeChangedCallback(name, oldvalue, newValue) {
        if (
            this.alleloBoard != null ||
            this.dataset.stoneSize == null ||
            this.dataset.width == null ||
            this.dataset.height == null
        ) {
            // 既に初期化済かまだパラメータが揃っていないか。
            return;
        }
        this.initialize(
            parseFloat(this.dataset.stoneSize),
            parseInt(this.dataset.width),
            parseInt(this.dataset.height)
        );
    }

    initialize(stoneSize, boardWidth, boardHeight) {
        const goban = this.shadowRoot.querySelector('#goban');
        const ctx = goban.getContext('2d');
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgb(0, 0, 0)';
        goban.width = stoneSize * boardWidth;
        goban.height = stoneSize * boardHeight;
        const halfSize = stoneSize / 2;
        function drawIntersections() {
            for (let y = halfSize; y < goban.height; y += stoneSize) {
                for (let x = halfSize; x < goban.width; x += stoneSize) {
                    ctx.beginPath();
                    ctx.arc(x, y, halfSize / 20, 0, Math.PI*2, false);
                    ctx.fill();
                }
            }
        }
        //drawLines();
        drawIntersections();
        const leaves = this.shadowRoot.querySelector('#leaves');
        leaves.setAttribute('width', `${goban.width}px`);
        leaves.setAttribute('height', `${goban.height}px`);
        const scale = stoneSize * 0.0036;
        for (let y = 1; y <= boardHeight; y++) {
            for (let x = 1; x <= boardWidth; x++) {
                const fourLeaves = document.createElementNS('http://www.w3.org/2000/svg', 'use');
                fourLeaves.id = `leaf-${x - 1 + (y - 1) * boardWidth}`;
                fourLeaves.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#four-leaves');
                fourLeaves.setAttribute('transform', `translate(${x * stoneSize - stoneSize / 2},${y * stoneSize - stoneSize / 2}) scale(${scale})`);
                fourLeaves.setAttribute('display', 'none');
                fourLeaves.classList.add('four-leaves');
                leaves.appendChild(fourLeaves);
            }
        }
        const territory = this.shadowRoot.querySelector('#territory');
        territory.setAttribute('width', `${goban.width}px`);
        territory.setAttribute('height', `${goban.height}px`);
        for (let y = 1; y <= boardHeight; y++) {
            for (let x = 1; x <= boardWidth; x++) {
                const karakusa = document.createElementNS('http://www.w3.org/2000/svg', 'use');
                karakusa.id = `territory-${x - 1 + (y - 1) * boardWidth}`;
                karakusa.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#seedlings');
                karakusa.setAttribute('transform', `translate(${x * stoneSize - stoneSize * 2 / 3},${y * stoneSize - stoneSize * 2 / 3}) scale(${scale})`);
                karakusa.setAttribute('display', 'none');
                karakusa.classList.add('territory');
                territory.appendChild(karakusa);
            }
        }
        this.alleloBoard = new AlleloBoard(stoneSize, boardWidth, boardHeight, this.shadowRoot);
    }
}

AlleloBoardElement.init();

const problems = [
    {
        stoneSize: 100,
        width: 3,
        height: 3
    }
];

/**
 * @file アプリのエントリーポイントです。
 */

async function drawPosition(board, position, move) {
    function p2p(p) {
        return board.xyToPoint.apply(board, position.pointToXy(p));
    }
    const state = new Float32Array(position.LENGTH);
    for (let i = 0; i < position.LENGTH; i++) {
        switch (position.getState(i)) {
            case BLACK:
            state[i] = 1.0;
            break;
            case WHITE:
            state[i] = -1.0;
            break;
            default:
            state[i] = 0.0;
        }
    }
    await board.drawStone(state, move.turn === BLACK ? 1.0 : -1.0, p2p(move.point), move.captives.map(p2p));

}
function prepareProblem(problem) {
    const container = document.querySelector('.container');
    const board = document.createElement('allelo-board');
    board.dataset.stoneSize = problem.stoneSize;
    board.dataset.width = problem.width;
    board.dataset.height = problem.height;
    const position = new GoPosition(problem.width, problem.height);
    board.alleloBoard.addEventListener('click', async function(x, y) {
        if (board.alleloBoard.drawing) {
            return;
        }
        const index = position.xyToPoint(x, y);
        const result = position.play(index);
        if (!result) {
            alert('illegal');
            return;
        }
        await drawPosition(board.alleloBoard, position, result);
    });
    container.appendChild(board);
}

function main() {
    for (const p of problems) {
        prepareProblem(p);
    }
}

main();
