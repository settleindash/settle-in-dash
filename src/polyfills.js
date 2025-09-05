// src/polyfills.js
import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

// Polyfill process
import process from 'process';
globalThis.process = process;

// Polyfill events
import { EventEmitter } from 'events';
globalThis.EventEmitter = EventEmitter;