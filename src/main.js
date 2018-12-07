/**
 * @file アプリのエントリーポイントです。
 */
/*
 * @author 市川雄二
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */
import { GoPosition, BLACK, WHITE, BAN } from 'allelo-board';
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
    if (board == null || problem.stoneSize || problem.width || problem.height) {
        if (board) {
            board.remove();
        }
        board = document.createElement('allelo-board');
        if (problem.bans) {
            board.onready = function() {
                board.setBans(problem.bans);
            }
        }
        container.appendChild(board);
        if (problem.width && problem.height) {
            position = new GoPosition(problem.width, problem.height);
        }
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
    if (problem.bans) {
        for (const ban of problem.bans) {
            position.setState(position.xyToPoint(ban[0], ban[1]), BAN);
        }
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

    if (!problem.keep && problem.explanation == null) {
        document.querySelector('#next').style.display = 'inline';
    } else {
        document.querySelector('#next').style.display = 'none';
        board.alleloBoard.addEventListener('click', async function(x, y) {
            async function tryAgain() {
                speechSynthesis.cancel();
                const text = '残念。もう一度挑戦してください。';
                balloon.innerText = text
                try {
                    await speak(text, 'ja', 'female');
                } catch (e) {}
                await prepareProblem(problem);
            }
            if (board.alleloBoard.drawing) {
                return;
            }
            if (!problem.keep) {
                board.alleloBoard.removeEventListener('click');
            }
            const index = position.xyToPoint(x, y);
            const result = position.play(index);
            if (!result) {
                if (!problem.keep) {
                    await tryAgain();
                }
                return;
            }
            await drawPosition(board.alleloBoard, position, result);
            if (!problem.keep) {
                if (!problem.answer || (problem.answer.some(e => e[0] == x && e[1] == y))) {
                    speechSynthesis.cancel();
                    balloon.innerText = problem.explanation;
                    document.querySelector('#next').style.display = 'inline';
                    try {
                        await speak(problem.explanation, 'ja', 'female');
                    } catch (e) {}
                } else {
                    await tryAgain();
                }
            }
        });
    }
    balloon.innerText = problem.question;
    try {
        await speak(problem.question, 'ja', 'female');
    } catch (e) {}
}

document.querySelector('#next').addEventListener('click', async function() {
    speechSynthesis.cancel();
    if (index < problems.length - 1) {
        await prepareProblem(problems[++index]);
    }
}, false);

if (!/Chrome/.test(navigator.userAgent)) {
    alert("Google Chromeをお使いください_o_");
}
let index = 0;
prepareProblem(problems[index]);
