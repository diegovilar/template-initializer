/**
 *
 */

import { Initializer, IInitializerOptions, IDictionary, deleteUtils } from '../build';
import * as path from 'path';

const PROJECT_PATH = path.resolve(__dirname, '..');
const GIT_PATH = `${PROJECT_PATH}/.git`;

function beforePackageWrite(pak: IDictionary<any>): void {

    if (pak && pak.scripts) {
        delete pak.scripts.postinstall;
    }

}

export const options: IInitializerOptions = {
    projectPath: PROJECT_PATH,
    beforePackageWrite,
    createReadme: true,
    initializeGit: true,
    delete: [
        { path: GIT_PATH, onError: deleteUtils.abortOnError }
    ]
};
