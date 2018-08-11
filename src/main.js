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
    await board.drawStone(state, move.turn === BLACK ? 1.0 : -1.0, p2p(move.point), move.captives.map(p2p));

}
function prepareProblem(problem) {
    const balloon = document.querySelector('#text');
    let board;
    if (problem.stoneSize) {
        const container = document.querySelector('#board-container');
        board = document.querySelector('#board-container allelo-board');
        if (board != null) {
            board.remove();
        }
        board = document.createElement('allelo-board');
        board.dataset.stoneSize = problem.stoneSize;
        board.dataset.width = problem.width;
        board.dataset.height = problem.height;
        container.appendChild(board);
    } else {
        board = document.querySelector('#board-container allelo-board');
    }
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
        balloon.innerText = problem.explanation;
        speak(problem.explanation, 'ja', 'female');
        console.log(document.querySelector('#next').style);
        document.querySelector('#next').style.display = 'inline';
        board.alleloBoard.removeEventListener('click');
    });
    balloon.innerText = problem.question;
    speak(problem.question, 'ja', 'female');
}

document.querySelector('#next').addEventListener('click', function() {
    if (index < problems.length) {
        prepareProblem(problems[index]);
    }
}, false);
let index = 0;
prepareProblem(problems[index++]);
