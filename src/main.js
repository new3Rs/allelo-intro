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