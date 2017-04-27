/**
 *
 */

import * as bluebird from 'bluebird';
import { IPromisedPrompt } from './abstract';

const prompt = require('prompt');

const promisedPrompt = prompt as IPromisedPrompt;

promisedPrompt.get = bluebird.promisify(prompt.get, { context: prompt }) as any;
promisedPrompt.message = '';
promisedPrompt.delimiter = '';

export {
    promisedPrompt as prompt,
};
