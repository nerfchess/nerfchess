"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RNG = void 0;
exports.makeSeed = makeSeed;
// Seeded RNG (Mulberry32)
class RNG {
    constructor(seed) {
        this.s = seed >>> 0 || 1;
    }
    static fromState(state) {
        return new RNG(state);
    }
    getState() {
        return this.s;
    }
    next() {
        let t = (this.s += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    int(n) {
        return Math.floor(this.next() * n);
    }
    pick(arr) {
        return arr[this.int(arr.length)];
    }
    fork() {
        return new RNG(this.int(2 ** 31));
    }
}
exports.RNG = RNG;
function makeSeed() {
    return Math.floor(Math.random() * 2 ** 31);
}
