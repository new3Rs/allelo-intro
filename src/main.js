/**
 * @file アプリのエントリーポイントです。
 */
/*
 * @author 市川雄二
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */
import { GoPosition, BLACK, WHITE } from 'allelo-board';
import { problems } from './problems.js';
import { speak } from './speech.js';

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
    if (move) {
        await board.drawStone(state, move.turn === BLACK ? 1.0 : -1.0, p2p(move.point), move.captives.map(p2p));
    } else {
        await board.drawStone(state, 1.0);
    }
}

let board;
let position;

async function prepareProblem(problem) {
    const balloon = document.querySelector('#text');
    const container = document.querySelector('#board-container');
    board = document.querySelector('#board-container allelo-board');
    if (board == null) {
        board = document.createElement('allelo-board');
        container.appendChild(board);
    }
    if (problem.stoneSize) {
        board.dataset.stoneSize = problem.stoneSize;
    }
    if (problem.width) {
        board.dataset.width = problem.width;
    }
    if (problem.height) {
        board.dataset.height = problem.height;
    }
    if (problem.stoneSize || problem.width || problem.height) {
        position = new GoPosition(problem.width, problem.height);
    }
    if (problem.blacks || problem.whites) {
        position.clear();
        if (problem.blacks) {
            for (const p of problem.blacks) {
                position.setState(position.xyToPoint(p[0], p[1]), BLACK);
            }
        }
        if (problem.whites) {
            for (const p of problem.whites) {
                position.setState(position.xyToPoint(p[0], p[1]), WHITE);
            }
        }
        await drawPosition(board.alleloBoard, position);
    }
    if (problem.turn) {
        position.turn = problem.turn;
    }

    balloon.innerText = problem.question;
    speak(problem.question, 'ja', 'female');
    if (problem.explanation == null) {
        document.querySelector('#next').style.display = 'inline';
    } else {
        board.alleloBoard.addEventListener('click', async function(x, y) {
            if (board.alleloBoard.drawing) {
                return;
            }
            board.alleloBoard.removeEventListener('click');
            const index = position.xyToPoint(x, y);
            const result = position.play(index);
            if (!result) {
                alert('illegal');
                return;
            }
            await drawPosition(board.alleloBoard, position, result);
            if (!problem.answer || (problem.answer[0] == x && problem.answer[1] == y)) {
                balloon.innerText = problem.explanation;
                speechSynthesis.cancel();
                speak(problem.explanation, 'ja', 'female');
                document.querySelector('#next').style.display = 'inline';
            } else {
                const text = '残念。もう一度挑戦してください。';
                balloon.innerText = text
                speechSynthesis.cancel();
                speak(text, 'ja', 'female');
                await prepareProblem(problem);
            }
        });
    }
}

document.querySelector('#next').addEventListener('click', async function() {
    speechSynthesis.cancel();
    if (index < problems.length - 1) {
        await prepareProblem(problems[++index]);
    }
}, false);
let index = 0;
prepareProblem(problems[index]);
